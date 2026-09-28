# Stack snippets

Starting points for common audit findings. Use only the parts that match a returned finding, adapt values to the site, and check the live response before and after (`curl -sI https://example.com/`). Platforms change their dashboards and defaults, so confirm against the current response rather than assuming.

The header values below are a conservative baseline:

| Header | Starting value | Notes |
|---|---|---|
| `Strict-Transport-Security` | `max-age=86400` | Raise to `max-age=31536000` once HTTPS works everywhere. Add `includeSubDomains` only when every subdomain serves HTTPS. |
| `X-Content-Type-Options` | `nosniff` | Safe on almost every site. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Remove a feature from the list if the site uses it. |
| `Content-Security-Policy-Report-Only` | `default-src 'self'; frame-ancestors 'self'` | Add the sources the site really loads, watch the console, then rename to `Content-Security-Policy`. `frame-ancestors` replaces `X-Frame-Options`. |

## nginx

Put shared headers in one file and include it, because an `add_header` inside a `location` block drops every `add_header` inherited from the server block.

```nginx
# /etc/nginx/snippets/security-headers.conf
add_header Strict-Transport-Security "max-age=86400" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy-Report-Only "default-src 'self'; frame-ancestors 'self'" always;
```

```nginx
http {
    server_tokens off;                 # hide the nginx version
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}

server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;
    include snippets/security-headers.conf;

    # Long cache only for files whose names change when their content changes
    location ~* \.(css|js|woff2|png|jpg|webp|avif|svg)$ {
        include snippets/security-headers.conf;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
}
```

Test with `nginx -t` before reloading.

## Apache

In `.htaccess` or the virtual host (needs `mod_headers` and `mod_rewrite`):

```apache
<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=86400"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Content-Security-Policy-Report-Only "default-src 'self'; frame-ancestors 'self'"
</IfModule>

RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
```

Version disclosure is set in the main server configuration, not in `.htaccess`:

```apache
ServerTokens Prod
ServerSignature Off
```

Test with `apachectl configtest` before reloading.

## Cloudflare

- HTTPS redirect: SSL/TLS, Edge Certificates, turn on Always Use HTTPS.
- HSTS: SSL/TLS, Edge Certificates, HTTP Strict Transport Security. Read the warnings in the dialog; the settings are hard to undo once browsers have cached them.
- Minimum TLS version: SSL/TLS, Edge Certificates, Minimum TLS Version (1.2 is a common baseline).
- Other headers: Rules, Transform Rules, a response header rule that sets each header from the baseline table.
- Cloudflare Pages: a `_headers` file in the build output, in the same format as the Netlify example below.

Headers set at Cloudflare override or add to the origin's headers. Avoid setting the same header in both places.

## Vercel and Next.js

`next.config.js`:

```js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=86400' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; frame-ancestors 'self'" },
];

module.exports = {
  poweredByHeader: false, // removes the X-Powered-By header
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

For a site on Vercel that does not use Next.js, `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

## Netlify

A `_headers` file in the publish directory:

```text
/*
  Strict-Transport-Security: max-age=86400
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy-Report-Only: default-src 'self'; frame-ancestors 'self'
```

Or in `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## WordPress

Prefer setting headers at the web server or CDN, because headers sent from PHP do not reach files the server delivers directly (images, CSS, JavaScript). If that is not possible, a must-use plugin in `wp-content/mu-plugins/security-headers.php`:

```php
<?php
/* Plugin Name: Security headers */
add_action('send_headers', function () {
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
});

// Remove the WordPress version from the page head
remove_action('wp_head', 'wp_generator');
```

For findings about WordPress core, plugins or themes, update them from the dashboard and remove plugins and themes that are not used. Take a backup first.

## Email DNS records

These are set at the DNS provider. Use the exact values the mail provider documents.

| Record | Name | Example value |
|---|---|---|
| SPF (TXT) | `example.com` | `v=spf1 include:<mail-provider-include> ~all` (only one SPF record per name; move to `-all` once every sender is listed) |
| DMARC (TXT) | `_dmarc.example.com` | `v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com` |
| DKIM | selector record from the mail provider | enable signing in the mail provider, then publish the record it gives |
| CAA | `example.com` | `0 issue "letsencrypt.org"`, one line per certificate authority the site uses |

For a domain that sends no email: SPF `v=spf1 -all`, DMARC `v=DMARC1; p=reject`, and a null MX record (`0 .`) if the DNS provider supports it.
