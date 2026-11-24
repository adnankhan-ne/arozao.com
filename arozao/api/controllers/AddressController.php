<?php
class AddressController extends BaseController {
    public function index(array $params): void {
        $user = $this->requireAuth();
        $stmt = Database::getInstance()->prepare('SELECT * FROM addresses WHERE user_id=:uid ORDER BY is_default DESC, created_at DESC');
        $stmt->execute(['uid' => (int)$user['user_id']]);
        Response::success($stmt->fetchAll());
    }

    public function store(array $params): void { $this->save(null); }
    public function update(array $params): void { $this->save((int)$params['id']); }

    private function save(?int $id): void {
        $user = $this->requireAuth();
        $data = $this->body();
        $errors = $this->validate($data, [
            'full_name' => 'required|string|min:2|max:191',
            'phone' => 'required|phone_bd',
            'division' => 'required|string|max:50',
            'district' => 'required|string|max:50',
            'street' => 'required|string|min:3',
        ]);
        if ($errors) Response::validationError($errors);
        $db = Database::getInstance();
        $uid = (int)$user['user_id'];
        if ($id !== null) {
            $check = $db->prepare('SELECT id FROM addresses WHERE id=:id AND user_id=:uid');
            $check->execute(['id' => $id, 'uid' => $uid]);
            if (!$check->fetch()) Response::notFound('Address not found.');
        }

        $db->beginTransaction();
        try {
            $isDefault = !empty($data['is_default']);
            if ($isDefault) $db->prepare('UPDATE addresses SET is_default=0 WHERE user_id=:uid')->execute(['uid' => $uid]);
            $values = [
                'uid' => $uid, 'label' => $data['label'] ?? 'Home',
                'full_name' => trim($data['full_name']), 'phone' => trim($data['phone']),
                'division' => trim($data['division']), 'district' => trim($data['district']),
                'upazila' => $data['upazila'] ?? null, 'area' => $data['area'] ?? null,
                'street' => trim($data['street']), 'postal_code' => $data['postal_code'] ?? null,
                'landmark' => $data['landmark'] ?? null, 'is_default' => $isDefault ? 1 : 0,
            ];
            if ($id === null) {
                $stmt = $db->prepare('INSERT INTO addresses (user_id,label,full_name,phone,division,district,upazila,area,street,postal_code,landmark,is_default) VALUES (:uid,:label,:full_name,:phone,:division,:district,:upazila,:area,:street,:postal_code,:landmark,:is_default)');
            } else {
                $values['id'] = $id;
                $stmt = $db->prepare('UPDATE addresses SET label=:label,full_name=:full_name,phone=:phone,division=:division,district=:district,upazila=:upazila,area=:area,street=:street,postal_code=:postal_code,landmark=:landmark,is_default=:is_default WHERE id=:id AND user_id=:uid');
            }
            $stmt->execute($values);
            if (!$isDefault) {
                $count = $db->prepare('SELECT COUNT(*) FROM addresses WHERE user_id=:uid');
                $count->execute(['uid' => $uid]);
                if ((int)$count->fetchColumn() === 1) {
                    $db->prepare('UPDATE addresses SET is_default=1 WHERE id=:id AND user_id=:uid')
                        ->execute(['id' => $id ?? (int)$db->lastInsertId(), 'uid' => $uid]);
                }
            }
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }
        Response::success(['id' => $id ?? (int)$db->lastInsertId()], 'Address saved.', $id === null ? 201 : 200);
    }

    public function destroy(array $params): void {
        $user = $this->requireAuth();
        $db = Database::getInstance();
        $stmt = $db->prepare('DELETE FROM addresses WHERE id=:id AND user_id=:uid');
        $stmt->execute(['id' => (int)$params['id'], 'uid' => (int)$user['user_id']]);
        if (!$stmt->rowCount()) Response::notFound('Address not found.');
        Response::success(null, 'Address deleted.');
    }

    public function setDefault(array $params): void {
        $user = $this->requireAuth();
        $db = Database::getInstance();
        $db->beginTransaction();
        try {
            $check = $db->prepare('SELECT id FROM addresses WHERE id=:id AND user_id=:uid FOR UPDATE');
            $check->execute(['id' => (int)$params['id'], 'uid' => (int)$user['user_id']]);
            if (!$check->fetch()) {
                $db->rollBack();
                Response::notFound('Address not found.');
            }
            $db->prepare('UPDATE addresses SET is_default=0 WHERE user_id=:uid')->execute(['uid' => (int)$user['user_id']]);
            $db->prepare('UPDATE addresses SET is_default=1 WHERE id=:id AND user_id=:uid')
                ->execute(['id' => (int)$params['id'], 'uid' => (int)$user['user_id']]);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }
        Response::success(null, 'Default address updated.');
    }
}
