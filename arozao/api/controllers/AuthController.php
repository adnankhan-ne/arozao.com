<?php
/**
 * Arozao PHP API — Auth Controller
 * Handles: register, login, logout, forgot/reset password, OTP, /me
 */
class AuthController extends BaseController {

    public function register(array $params): void {
        $data   = $this->body();
        $errors = $this->validate($data, [
            'full_name' => 'required|string|min:2|max:100',
            'email'     => 'required|email',
            'phone'     => 'phone_bd',
            'password'  => 'required|min:8|confirmed',
        ]);

        if ($errors) { Response::validationError($errors); }

        $db = Database::getInstance();

        // Check duplicate
        $stmt = $db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => strtolower(trim($data['email']))]);
        if ($stmt->fetch()) {
            Response::error('An account with this email already exists.', 409);
        }

        $hash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $db->prepare("
            INSERT INTO users (email, phone, password_hash, full_name, role)
            VALUES (:email, :phone, :hash, :name, 'customer')
        ");
        $stmt->execute([
            'email' => strtolower(trim($data['email'])),
            'phone' => !empty($data['phone']) ? trim($data['phone']) : null,
            'hash'  => $hash,
            'name'  => trim($data['full_name']),
        ]);

        $userId = (int)$db->lastInsertId();
        $user   = $this->fetchUser($userId);
        $token  = JWT::encode(['user_id' => $userId, 'email' => $user['email'], 'role' => $user['role']]);

        Response::success(['user' => $user, 'token' => $token], 'Account created successfully.', 201);
    }

    public function login(array $params): void {
        $data   = $this->body();
        $errors = $this->validate($data, [
            'email'    => 'required|email',
            'password' => 'required',
        ]);
        if ($errors) { Response::validationError($errors); }

        $db   = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => strtolower(trim($data['email']))]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            Response::error('Invalid email or password.', 401);
        }

        if (!$user['is_active']) {
            Response::error('Your account has been suspended. Please contact support.', 403);
        }

        // Update last login
        $db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = :id")
           ->execute(['id' => $user['id']]);

        $token = JWT::encode(['user_id' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]);
        $safeUser = $this->fetchUser((int)$user['id']);

        Response::success(['user' => $safeUser, 'token' => $token], 'Login successful.');
    }

    public function logout(array $params): void {
        // JWT is stateless; client discards token
        Response::success(null, 'Logged out successfully.');
    }

    public function me(array $params): void {
        $auth = $this->requireAuth();
        $user = $this->fetchUser((int)$auth['user_id']);
        if (!$user) { Response::notFound('User not found.'); }
        Response::success($user);
    }

    public function refresh(array $params): void {
        $auth = $this->requireAuth();
        $user = $this->fetchUser((int)$auth['user_id']);
        if (!$user || !(int)$user['is_active']) {
            Response::unauthorized('This user account is unavailable.');
        }
        $token = JWT::encode([
            'user_id' => (int)$user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
        ]);
        Response::success(['user' => $user, 'token' => $token], 'Session refreshed.');
    }

    public function updateProfile(array $params): void {
        $auth = $this->requireAuth();
        $data = $this->body();
        $rules = [];
        if (array_key_exists('full_name', $data)) $rules['full_name'] = 'required|string|min:2|max:100';
        if (array_key_exists('phone', $data) && !empty($data['phone'])) $rules['phone'] = 'phone_bd';
        if (array_key_exists('gender', $data) && $data['gender'] !== '') $rules['gender'] = 'in:male,female,other';
        if ($errors = $this->validate($data, $rules)) Response::validationError($errors);

        $sets = [];
        $values = ['id' => (int)$auth['user_id']];
        $allowed = [
            'full_name' => 'full_name',
            'phone' => 'phone',
            'gender' => 'gender',
            'date_of_birth' => 'date_of_birth',
            'preferred_language' => 'preferred_language',
            'newsletter_subscribed' => 'newsletter_subscribed',
        ];
        foreach ($allowed as $input => $column) {
            if (!array_key_exists($input, $data)) continue;
            $value = $data[$input];
            if ($input === 'phone' && ($value === '' || $value === null)) $value = null;
            if ($input === 'gender' && $value === '') $value = null;
            if ($input === 'date_of_birth' && $value !== null && $value !== '') {
                $date = DateTime::createFromFormat('!Y-m-d', (string)$value);
                if (!$date || $date->format('Y-m-d') !== $value) {
                    Response::validationError(['date_of_birth' => ['Use a valid YYYY-MM-DD date.']]);
                }
            }
            if ($input === 'preferred_language' && !in_array($value, ['en', 'bn'], true)) {
                Response::validationError(['preferred_language' => ['Choose English or Bangla.']]);
            }
            if ($input === 'newsletter_subscribed') {
                if (!in_array($value, [true, false, 0, 1, '0', '1'], true)) {
                    Response::validationError(['newsletter_subscribed' => ['Must be true or false.']]);
                }
                $value = (int)(bool)$value;
            }
            $sets[] = "$column=:$column";
            $values[$column] = $value;
        }
        if (!$sets) Response::validationError(['profile' => ['At least one supported profile field is required.']]);

        Database::getInstance()->prepare('UPDATE users SET ' . implode(', ', $sets) . ', updated_at=NOW() WHERE id=:id')
            ->execute($values);
        Response::success($this->fetchUser((int)$auth['user_id']), 'Profile updated.');
    }

    public function passwordResetToken(array $params): void {
        $providedKey = $_SERVER['HTTP_X_API_INTERNAL_KEY'] ?? '';
        if (API_INTERNAL_KEY === '') Response::error('Password reset delivery is not configured.', 503);
        if (!hash_equals(API_INTERNAL_KEY, $providedKey)) Response::unauthorized();

        $data = $this->body();
        $errors = $this->validate($data, ['email' => 'required|email']);
        if ($errors) Response::validationError($errors);

        $email = strtolower(trim($data['email']));
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT id, email, full_name FROM users WHERE email=:email AND is_active=1 LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        if (!$user) Response::success(['found' => false]);

        $token = bin2hex(random_bytes(32));
        $db->prepare('UPDATE password_resets SET used_at=NOW() WHERE email=:email AND used_at IS NULL')
            ->execute(['email' => $email]);
        $db->prepare('INSERT INTO password_resets (email, token_hash, expires_at) VALUES (:email, :hash, DATE_ADD(NOW(), INTERVAL 15 MINUTE))')
            ->execute(['email' => $email, 'hash' => hash('sha256', $token)]);
        Response::success([
            'found' => true,
            'token' => $token,
            'userId' => (string)$user['id'],
            'fullName' => $user['full_name'],
            'email' => $user['email'],
            'expiresInMinutes' => 15,
        ]);
    }

    public function resetPassword(array $params): void {
        $data   = $this->body();
        $errors = $this->validate($data, [
            'token'    => 'required',
            'password' => 'required|min:8|confirmed',
        ]);
        if ($errors) { Response::validationError($errors); }

        $db = Database::getInstance();
        $db->beginTransaction();
        try {
            $tokenHash = hash('sha256', $data['token']);
            $stmt = $db->prepare('SELECT * FROM password_resets WHERE token_hash=:hash AND used_at IS NULL AND expires_at>NOW() LIMIT 1 FOR UPDATE');
            $stmt->execute(['hash' => $tokenHash]);
            $reset = $stmt->fetch();
            if (!$reset) {
                $db->rollBack();
                Response::error('Invalid or expired reset token.', 400);
            }

            $newHash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
            $db->prepare('UPDATE users SET password_hash=:hash WHERE email=:email')
                ->execute(['hash' => $newHash, 'email' => $reset['email']]);
            $db->prepare('UPDATE password_resets SET used_at=NOW() WHERE id=:id AND used_at IS NULL')
                ->execute(['id' => $reset['id']]);
            $userStmt = $db->prepare('SELECT id, email, full_name FROM users WHERE email=:email LIMIT 1');
            $userStmt->execute(['email' => $reset['email']]);
            $user = $userStmt->fetch();
            if (!$user) {
                $db->rollBack();
                Response::error('The account for this reset link is unavailable.', 400);
            }
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            throw $error;
        }

        Response::success([
            'userId' => (string)$user['id'],
            'email' => $user['email'],
            'fullName' => $user['full_name'],
        ], 'Password reset successfully. Please login.');
    }

    public function sendOtp(array $params): void {
        $data   = $this->body();
        $errors = $this->validate($data, [
            'phone'   => 'required|phone_bd',
            'purpose' => 'required|in:cod_verify,phone_verify,login',
        ]);
        if ($errors) { Response::validationError($errors); }

        $code = str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $db   = Database::getInstance();
        $db->prepare("INSERT INTO otp_codes (phone, code, purpose, expires_at) VALUES (:phone, :code, :purpose, DATE_ADD(NOW(), INTERVAL 5 MINUTE))")
           ->execute(['phone' => $data['phone'], 'code' => $code, 'purpose' => $data['purpose']]);

        // TODO: Send via SMS gateway
        // SmsService::send($data['phone'], "Your Arozao OTP is: $code. Valid for 5 minutes.");

        // In dev mode, return OTP directly
        $responseData = APP_DEBUG ? ['otp' => $code] : null;
        Response::success($responseData, 'OTP sent successfully.');
    }

    public function verifyOtp(array $params): void {
        $data   = $this->body();
        $errors = $this->validate($data, [
            'phone'   => 'required|phone_bd',
            'code'    => 'required|min:6|max:6',
            'purpose' => 'required|in:cod_verify,phone_verify,login',
        ]);
        if ($errors) { Response::validationError($errors); }

        $db   = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM otp_codes WHERE phone = :phone AND code = :code AND purpose = :purpose AND expires_at > NOW() AND verified_at IS NULL ORDER BY id DESC LIMIT 1");
        $stmt->execute(['phone' => $data['phone'], 'code' => $data['code'], 'purpose' => $data['purpose']]);
        $otp = $stmt->fetch();

        if (!$otp) { Response::error('Invalid or expired OTP.', 400); }

        $db->prepare("UPDATE otp_codes SET verified_at = NOW() WHERE id = :id")
           ->execute(['id' => $otp['id']]);

        // Mark phone as verified if applicable
        if ($data['purpose'] === 'phone_verify') {
            $db->prepare("UPDATE users SET phone_verified_at = NOW() WHERE phone = :phone")
               ->execute(['phone' => $data['phone']]);
        }

        Response::success(['verified' => true], 'OTP verified successfully.');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    private function fetchUser(int $id): ?array {
        $db   = Database::getInstance();
        $stmt = $db->prepare("SELECT id, email, phone, full_name, role, gender, avatar_url, is_active, email_verified_at, phone_verified_at, date_of_birth, preferred_language, newsletter_subscribed, last_login_at, created_at FROM users WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }
}
