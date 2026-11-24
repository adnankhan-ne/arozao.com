<?php
/**
 * Arozao PHP API — JWT (HS256, pure PHP, no library dependency)
 */
class JWT {

    public static function encode(array $payload): string {
        $header  = self::base64url(json_encode(['alg' => JWT_ALGORITHM, 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $issued  = time();
        $payload['iat'] = $issued;
        $payload['exp'] = $issued + JWT_EXPIRY_SECONDS;
        $body    = self::base64url(json_encode($payload, JSON_THROW_ON_ERROR));
        $sig     = self::sign("$header.$body");
        return "$header.$body.$sig";
    }

    public static function decode(string $token): array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Invalid token format.');
        }

        [$header, $body, $sig] = $parts;

        $expectedSig = self::sign("$header.$body");
        if (!hash_equals($expectedSig, $sig)) {
            throw new RuntimeException('Invalid token signature.');
        }

        $decodedHeader = json_decode(self::base64urlDecode($header), true);
        if (!is_array($decodedHeader) || ($decodedHeader['alg'] ?? null) !== JWT_ALGORITHM || ($decodedHeader['typ'] ?? null) !== 'JWT') {
            throw new RuntimeException('Invalid token header.');
        }
        $payload = json_decode(self::base64urlDecode($body), true);
        if (!is_array($payload) || !isset($payload['exp']) || !is_numeric($payload['exp'])) {
            throw new RuntimeException('Malformed token payload.');
        }

        if ((int)$payload['exp'] < time()) {
            throw new RuntimeException('Token has expired.');
        }

        return $payload;
    }

    private static function sign(string $data): string {
        return self::base64url(hash_hmac('sha256', $data, JWT_SECRET, true));
    }

    private static function base64url(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $data): string {
        $decoded = base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4), true);
        if ($decoded === false) throw new RuntimeException('Malformed token encoding.');
        return $decoded;
    }
}
