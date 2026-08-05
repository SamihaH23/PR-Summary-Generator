import { SampleDiff } from '../types';

export const SAMPLE_DIFFS: SampleDiff[] = [
  {
    id: 'auth-service',
    title: 'Auth Service & Password Validation Refactor',
    description: 'Refactors the authentication service, adds password strength validation, updates JWT expiration handling, and modifies the /auth/login endpoint.',
    tags: ['Auth', 'Security', 'API Change'],
    rawDiff: `diff --git a/src/services/auth.service.ts b/src/services/auth.service.ts
index a1b2c3d..e4f5g6h 100644
--- a/src/services/auth.service.ts
+++ b/src/services/auth.service.ts
@@ -12,18 +12,32 @@ export class AuthService {
-  async login(username: string, pass: string) {
-    const user = await this.userRepo.findUser(username);
-    if (!user || user.password !== pass) {
-      throw new Error('Invalid credentials');
-    }
-    return this.generateToken(user);
-  }
+  async login(credentials: LoginDto) {
+    const { email, password, rememberMe } = credentials;
+    
+    // Validate password complexity requirements
+    this.validatePasswordStrength(password);

+    const user = await this.userRepo.findByEmail(email);
+    if (!user) {
+      throw new UnauthorizedException('Invalid email or password');
+    }
+
+    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
+    if (!isValidPassword) {
+      throw new UnauthorizedException('Invalid email or password');
+    }
+
+    const expiresIn = rememberMe ? '30d' : '1h';
+    return this.tokenService.createSessionToken(user.id, { expiresIn });
+  }

+  private validatePasswordStrength(password: string): void {
+    if (password.length < 8) {
+      throw new BadRequestException('Password must be at least 8 characters long');
+    }
+    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
+    if (!hasSpecialChar) {
+      throw new BadRequestException('Password must contain at least one special character');
+    }
+  }

diff --git a/src/controllers/auth.controller.ts b/src/controllers/auth.controller.ts
index 89234ab..1098c7d 100644
--- a/src/controllers/auth.controller.ts
+++ b/src/controllers/auth.controller.ts
@@ -18,6 +18,7 @@ export class AuthController {
-  @Post('/login')
-  async login(@Body() body: any) {
-    return this.authService.login(body.username, body.password);
+  @Post('/v2/auth/login')
+  async login(@Body() loginDto: LoginDto) {
+    return this.authService.login(loginDto);
   }
`
  },
  {
    id: 'payment-webhook',
    title: 'Stripe Payment Gateway & Webhook Signature Verification',
    description: 'Adds HMAC SHA256 signature verification for incoming Stripe webhooks and updates transaction status handling.',
    tags: ['Payments', 'Webhooks', 'Critical Risk'],
    rawDiff: `diff --git a/src/webhooks/stripe.ts b/src/webhooks/stripe.ts
index c7f1011..f9829aa 100644
--- a/src/webhooks/stripe.ts
+++ b/src/webhooks/stripe.ts
@@ -5,10 +5,23 @@ export async function handleStripeWebhook(req: Request, res: Response) {
-  const event = req.body;
-  if (event.type === 'payment_intent.succeeded') {
-    await updateOrderPayment(event.data.object.id, 'PAID');
-  }
-  res.json({ received: true });
+  const sig = req.headers['stripe-signature'];
+  let event: Stripe.Event;
+
+  try {
+    event = stripe.webhooks.constructEvent(
+      req.rawBody,
+      sig as string,
+      process.env.STRIPE_WEBHOOK_SECRET!
+    );
+  } catch (err: any) {
+    logger.error(\`Webhook signature verification failed: \${err.message}\`);
+    return res.status(400).send(\`Webhook Error: \${err.message}\`);
+  }

+  switch (event.type) {
+    case 'payment_intent.succeeded':
+      await updateOrderPayment(event.data.object.id, 'PAID');
+      break;
+    case 'payment_intent.payment_failed':
+      await updateOrderPayment(event.data.object.id, 'FAILED');
+      break;
+  }

+  return res.json({ received: true });
 }
`
  },
  {
    id: 'schema-migration',
    title: 'Database Schema Migration & API Contract Breaking Change',
    description: 'Removes legacy `user.fullName` field in favor of `firstName` and `lastName`. Updates SQL migration and API response serializer.',
    tags: ['Database', 'Breaking Change', 'High Risk'],
    rawDiff: `diff --git a/migrations/20260805_update_users.sql b/migrations/20260805_update_users.sql
new file mode 100644
index 0000000..d2e3f4a
--- /dev/null
+++ b/migrations/20260805_update_users.sql
@@ -0,0 +1,6 @@
+ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
+ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
+UPDATE users SET first_name = split_part(full_name, ' ', 1), last_name = split_part(full_name, ' ', 2);
+ALTER TABLE users DROP COLUMN full_name;

diff --git a/src/serializers/user.serializer.ts b/src/serializers/user.serializer.ts
index b8c9d0e..a123f56 100644
--- a/src/serializers/user.serializer.ts
+++ b/src/serializers/user.serializer.ts
@@ -4,6 +4,7 @@ export function serializeUser(user: UserRecord) {
   return {
     id: user.id,
-   fullName: user.fullName,
+   firstName: user.firstName,
+   lastName: user.lastName,
     email: user.email
   };
 }
`
  }
];
