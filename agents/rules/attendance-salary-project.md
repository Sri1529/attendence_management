# Attendance & Salary SaaS — Project Rules

## 1. PROJECT IDENTITY

This project is a simple, production-quality, multi-tenant SaaS application for:

- Employee management
- Attendance management
- Basic leave management
- Salary management
- Employee salary advances
- Salary deductions and earnings
- Monthly payroll
- Payslips
- Custom roles and permissions
- Subscription management
- Payment gateway integration
- Audit logging

The goal is a clean, maintainable, minimal SaaS.

DO NOT turn this into a full HRMS or enterprise ERP.

---

# 2. TECHNOLOGY STACK

Backend:

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- @nestjs/typeorm
- @nestjs/config
- JWT authentication

Database:

- PostgreSQL only
- TypeORM migrations only

Architecture:

- Modular monolith
- REST API
- Clean separation of controllers, services, DTOs, entities, guards and utilities

Do not introduce microservices unless explicitly requested.

Do not introduce Redis, Kafka, RabbitMQ, MongoDB or other infrastructure unless explicitly required.

---

# 3. EXISTING PROJECT MUST BE PRESERVED

Before changing anything:

1. Inspect the existing project.
2. Inspect package.json.
3. Inspect the existing NestJS structure.
4. Inspect app.module.ts.
5. Inspect main.ts.
6. Inspect TypeORM DataSource.
7. Inspect all existing entities.
8. Inspect all existing migrations.
9. Inspect the actual PostgreSQL schema when database changes are involved.
10. Understand existing relationships before adding new ones.

Never blindly overwrite existing code.

Never recreate the project.

Never delete working code unless there is a documented reason.

Prefer the smallest safe change.

---

# 4. DATABASE RULES — NON-NEGOTIABLE

The database is PostgreSQL.

TypeORM is the ORM.

TypeORM migrations are the ONLY approved mechanism for schema changes.

NEVER use:

synchronize: true

`synchronize` MUST remain:

false

NEVER manually create, alter or drop application tables through:

- pgAdmin
- psql
- ad-hoc SQL scripts
- application startup logic
- synchronization
- ORM auto-sync

All schema changes MUST be represented by TypeORM migrations.

---

# 5. MIGRATION WORKFLOW

Whenever a database change is required:

1. Inspect current database schema.
2. Inspect existing entities.
3. Inspect existing migrations.
4. Determine whether a table/column/constraint already exists.
5. Reuse existing structures where appropriate.
6. Modify/create the entity.
7. Generate a new TypeORM migration.
8. Inspect the generated migration manually.
9. Verify both `up()` and `down()`.
10. Run the migration.
11. Verify the resulting PostgreSQL schema.
12. Run relevant tests.
13. Continue only after verification.

Never modify an already-applied migration.

Never delete an existing migration.

Never generate duplicate tables or duplicate columns.

Never assume the database is empty.

Every migration must be deterministic and safe.

---

# 6. DATABASE DESIGN

Use UUID primary keys unless there is a strong reason not to.

Use PostgreSQL appropriate types.

For monetary values:

USE:

NUMERIC / DECIMAL

NEVER use floating-point types for money.

Examples:

salary
advance amount
bonus
overtime
deduction
gross salary
net salary
subscription price
payment amount

must use NUMERIC/DECIMAL.

Use:

TIMESTAMPTZ

for timestamps where appropriate.

Use foreign keys.

Use NOT NULL where appropriate.

Use unique constraints and indexes where appropriate.

Use database constraints in addition to application validation.

Do not over-normalize.

Do not over-engineer.

---

# 7. MULTI-TENANCY — CRITICAL

This is a multi-tenant SaaS.

Each customer company is a separate tenant.

Example:

Company A

- users
- employees
- attendance
- advances
- salary
- payroll
- payslips
- audit logs

Company B

- completely separate data

Company A MUST NEVER access Company B data.

Most business tables must contain:

company_id

where appropriate.

Tenant isolation MUST be enforced in the backend.

NEVER trust `company_id` supplied by the frontend.

The authenticated user's company/tenant must determine the tenant context.

Never allow:

GET /employees/:id

or any similar endpoint to access a resource simply because the user knows the ID.

Always verify:

1. Authentication
2. Company membership
3. Permission
4. Resource ownership/tenant
5. Business rules

Cross-tenant access must be denied.

This is a security requirement, not an optional feature.

---

# 8. AUTHENTICATION

Use secure authentication.

Implement as required:

- login
- logout
- access token
- refresh token
- password hashing
- password validation
- authenticated user context
- inactive-user protection

Passwords MUST be hashed.

Never store plaintext passwords.

Never return password hashes.

Never hardcode JWT secrets.

Secrets MUST come from environment variables.

Do not expose secrets through logs, responses or source code.

---

# 9. USER MODEL

There are three conceptual levels:

## Platform Admin

Manages the SaaS platform.

Can:

- manage customer companies
- manage subscription plans
- view subscriptions
- view platform payment information
- suspend/reactivate companies
- view platform-level information

## Company Owner

Owns a customer company.

Can:

- manage company settings
- create application users
- create custom roles
- assign roles
- manage employees
- manage attendance
- manage advances
- manage salary
- manage payroll
- view/download payslips
- manage subscription
- view audit logs

## Company User

A normal application user.

Access is determined by the permissions of the assigned role.

---

# 10. CUSTOM ROLES

Company Owners MUST be able to:

- create roles
- update roles
- activate/deactivate roles
- assign permissions to roles
- create application users
- assign a role to an application user
- change a user's role
- deactivate application users

The Company Owner MUST NOT create arbitrary permission definitions.

Permissions are system-defined.

Roles are company-specific.

A role contains selected system permissions.

---

# 11. PERMISSION SYSTEM

Use permission-based authorization.

Do not rely only on:

if role === "OFFICER"

Authorization should use permissions.

Example permissions:

EMPLOYEE_VIEW
EMPLOYEE_CREATE
EMPLOYEE_UPDATE
EMPLOYEE_DELETE

ATTENDANCE_VIEW
ATTENDANCE_CREATE
ATTENDANCE_UPDATE
ATTENDANCE_DELETE

LEAVE_VIEW
LEAVE_CREATE
LEAVE_UPDATE
LEAVE_DELETE

SALARY_VIEW
SALARY_CREATE
SALARY_UPDATE

ADVANCE_VIEW
ADVANCE_CREATE
ADVANCE_UPDATE
ADVANCE_DELETE

PAYROLL_VIEW
PAYROLL_GENERATE
PAYROLL_UPDATE
PAYROLL_FINALIZE
PAYROLL_MARK_PAID

PAYSLIP_VIEW
PAYSLIP_DOWNLOAD

USER_VIEW
USER_CREATE
USER_UPDATE
USER_DEACTIVATE

ROLE_VIEW
ROLE_CREATE
ROLE_UPDATE
ROLE_DELETE

COMPANY_SETTINGS_VIEW
COMPANY_SETTINGS_UPDATE

SUBSCRIPTION_VIEW
SUBSCRIPTION_MANAGE

AUDIT_LOG_VIEW

Permission names may be refined if necessary, but do not create unnecessary permissions.

Use reusable:

- permission decorators
- authorization guards
- permission checking service

Do not duplicate authorization logic across controllers.

---

# 12. OWNER SAFETY

There must always be a valid Company Owner.

Do not allow a Company Owner to:

- remove the last owner
- deactivate the last owner
- accidentally remove owner-level access
- assign an invalid role that eliminates company ownership

Owner access must remain protected.

---

# 13. EMPLOYEE MANAGEMENT

Employees are company-owned records.

Support:

- create
- view
- update
- activate/deactivate
- search
- filtering
- pagination

Employee information may include:

- employee_code
- first_name
- last_name
- email
- phone
- joining_date
- department
- designation
- employment status
- current salary

Do not physically delete employees if historical attendance/payroll data depends on them.

Prefer inactive/archived status.

Employee code must be unique within the company.

---

# 14. ATTENDANCE

Supported statuses:

PRESENT
ABSENT
HALF_DAY
LEAVE
HOLIDAY

Attendance must be company-isolated.

Prevent duplicate attendance for:

employee + date

Use a database constraint where appropriate.

Support:

- daily attendance
- monthly attendance
- employee attendance history
- bulk attendance
- edit attendance
- search/filter
- attendance summary

Attendance changes must be audited where appropriate.

---

# 15. LEAVE

Keep leave management simple.

Support basic leave types:

- Casual Leave
- Sick Leave
- Paid Leave
- Unpaid Leave

Do not implement a complex enterprise leave workflow unless explicitly requested.

Prevent obvious conflicts between leave and attendance.

---

# 16. SALARY

Salary is financial/historical data.

Do not blindly overwrite historical salary values.

Use salary history/effective dates where appropriate.

Example:

January: 25,000
June: 30,000

Payroll for August must use the applicable salary for August.

Salary calculations must be deterministic.

Financial calculations must not use JavaScript floating-point arithmetic carelessly.

Use decimal-safe handling.

---

# 17. ADVANCES

Salary advances are a core feature.

Example:

Advance:
10,000

August deduction:
3,000

Remaining:
7,000

Support:

- create advance
- view advance
- update where allowed
- employee advance history
- outstanding balance
- partial deduction
- full deduction
- settled status

NEVER allow:

deduction > outstanding balance

Advance deductions must be atomic and safe under concurrent requests.

Use transactions/locking/atomic database operations where necessary.

---

# 18. SALARY ADJUSTMENTS

Support simple earnings:

- overtime
- bonus
- incentive
- other earnings

Support simple deductions:

- attendance deduction
- advance repayment
- other deduction

Do not create a complicated payroll rules engine.

---

# 19. PAYROLL

Payroll calculation:

Basic Salary

- Overtime
- Bonus
- Other Earnings

* Attendance Deduction
* Advance Deduction
* # Other Deduction
  NET SALARY

Payroll should be monthly.

Suggested states:

DRAFT
FINALIZED
PAID

Workflow:

Generate
→ Review
→ Finalize
→ Paid

Prevent duplicate payroll for the same employee and period.

Use database constraints.

---

# 20. PAYROLL IMMUTABILITY — CRITICAL

Once payroll is FINALIZED:

It must NOT be casually edited.

Finalized payroll must preserve a snapshot of:

- salary
- attendance summary
- earnings
- deductions
- advance deduction
- net salary

Later changes to:

- employee salary
- attendance
- advances

must NOT silently change finalized historical payroll.

If a correction is needed, use a controlled correction/reversal mechanism.

Never silently rewrite financial history.

---

# 21. PAYROLL CONCURRENCY

Protect against concurrent operations.

Examples:

Two officers generate payroll simultaneously.

Result:

Only one valid payroll should exist.

Two requests deduct the same advance simultaneously.

Result:

Outstanding balance must never become negative.

Two requests create attendance for the same employee/date.

Result:

Database constraint must prevent duplicate attendance.

Use transactions and database constraints where required.

---

# 22. PAYSLIPS

Payslips should be generated from finalized payroll.

Include:

- company information
- employee information
- payroll period
- attendance summary
- earnings
- deductions
- advance deduction
- net salary
- payroll status

Generate a professional but simple PDF.

Payslip access must be tenant- and permission-controlled.

---

# 23. AUDIT LOGS

Important business actions must be auditable.

Examples:

- employee created
- employee updated
- salary changed
- attendance changed
- advance created
- advance updated
- role created
- role permissions changed
- user role changed
- payroll generated
- payroll finalized
- payroll marked paid
- subscription changed

Audit log should contain:

- company_id
- actor_user_id
- action
- entity_type
- entity_id
- metadata
- timestamp

Audit logs are append-oriented.

Ordinary users must not edit/delete audit records.

Never log:

- passwords
- JWT secrets
- payment secrets
- sensitive credentials

---

# 24. SUBSCRIPTIONS

The application is a SaaS.

Support subscription plans such as:

STARTER
BUSINESS
PRO

Plans may have:

- monthly price
- employee limit
- application-user limit
- active/inactive status

Subscription statuses may include:

TRIAL
ACTIVE
PAST_DUE
CANCELLED
EXPIRED
SUSPENDED

Do not hardcode plan pricing throughout the codebase.

Keep subscription state in the database.

---

# 25. FREE TRIAL

Support a simple free trial.

Example:

7 or 14 days.

When trial expires:

- do not delete company data
- allow login
- allow billing/renewal
- restrict operational features appropriately

Subscription restrictions MUST be enforced on the backend.

---

# 26. PAYMENT GATEWAY

For the initial India-focused version, Razorpay may be used.

Payment security is critical.

Never trust only a frontend payment-success callback.

Payment flow:

Plan selection
→ backend payment/subscription creation
→ checkout
→ payment
→ webhook
→ signature verification
→ idempotent processing
→ subscription update

Webhook processing MUST be:

- authenticated/verified
- idempotent
- safe against duplicate events

Never store raw card information.

Never expose gateway secret keys to the frontend.

Gateway credentials MUST come from environment variables.

---

# 27. SUBSCRIPTION LIMITS

Plan limits must be enforced server-side.

Example:

Starter:
10 employees

If:

10 / 10

then employee #11 must be rejected unless the company upgrades.

Do not rely on frontend validation.

---

# 28. API SECURITY

Every protected API must verify:

1. Authentication
2. Tenant/company
3. Permission
4. Resource ownership
5. Business rules

Never rely on the frontend for authorization.

Validate all request bodies.

Validate route parameters.

Validate query parameters.

Use DTOs.

Use appropriate HTTP status codes.

Do not expose stack traces in production.

---

# 29. INPUT VALIDATION

All external input must be validated.

Validate:

- UUIDs
- emails
- dates
- enum values
- numeric amounts
- pagination
- search
- filters
- required fields

Do not trust frontend validation.

Backend validation is mandatory.

---

# 30. TRANSACTIONS

Use database transactions where multiple operations must succeed/fail together.

Especially consider transactions for:

- payroll generation
- payroll finalization
- advance deductions
- subscription state transitions
- payment processing
- role/permission updates where consistency matters

Do not wrap every simple CRUD operation in unnecessary transactions.

---

# 31. SOFT DELETE / DEACTIVATION

Prefer status/deactivation for important historical entities.

Especially:

- employees
- application users
- roles
- departments
- designations
- companies

Do not physically delete records if doing so could destroy historical payroll, attendance or audit information.

---

# 32. CODE QUALITY

Use:

- clear naming
- small services
- focused methods
- DTOs
- enums where appropriate
- reusable guards
- reusable decorators
- centralized error handling
- consistent response patterns

Avoid:

- giant services
- giant controllers
- duplicated logic
- magic numbers
- hardcoded secrets
- unnecessary abstractions
- premature optimization

Do not add comments that merely restate the code.

Add comments only where business reasoning is not obvious.

---

# 33. TESTING

Every important business module must have tests.

Test at minimum:

Authentication:

- valid login
- invalid login
- inactive user

Authorization:

- permission allowed
- permission denied
- cross-tenant access denied

Employees:

- duplicate employee code
- tenant isolation

Attendance:

- duplicate attendance
- invalid status
- tenant isolation

Advances:

- partial repayment
- full repayment
- over-deduction rejection
- concurrency safety

Payroll:

- salary calculation
- attendance deduction
- advance deduction
- bonus
- overtime
- duplicate payroll prevention
- finalization
- immutability

Subscriptions:

- employee limits
- expired subscription
- trial expiry

Payments:

- webhook verification
- duplicate webhook/idempotency

Do not claim tests pass unless they were actually executed.

---

# 34. BUILD / LINT / TEST

After significant implementation:

Run:

- TypeScript build
- lint
- unit tests
- relevant integration tests
- migration verification

Fix errors before moving forward.

Do not leave TypeScript errors unresolved.

Do not knowingly leave failing tests without documenting the reason.

---

# 35. DEVELOPMENT WORKFLOW

Implement features in small phases.

For every module:

1. Inspect existing implementation.
2. Inspect database schema.
3. Plan.
4. Implement entity/DTO/service/controller.
5. Generate migration.
6. Review migration.
7. Run migration.
8. Verify database.
9. Implement authorization.
10. Add tests.
11. Run tests.
12. Run build/lint.
13. Review security.
14. Continue to next module.

Do not implement the whole project blindly in one uncontrolled change.

---

# 36. FEATURE SCOPE

The V1 product includes:

- Authentication
- Company management
- Application users
- Custom roles
- Permissions
- Employees
- Departments
- Designations
- Attendance
- Basic leave
- Salary
- Advances
- Salary adjustments
- Payroll
- Payslips
- Dashboard
- Audit logs
- Subscription
- Free trial
- Payment gateway
- Subscription limits
- Platform Admin

---

# 37. DO NOT ADD THESE FEATURES

Do NOT implement unless explicitly requested:

- face recognition
- GPS attendance
- biometric devices
- mobile app
- AI
- complex tax engine
- PF/ESI automation
- accounting integration
- complex shift engine
- advanced overtime rules
- multi-country payroll
- employee self-service portal
- complicated leave approval workflow
- unnecessary notifications
- microservices
- unnecessary Redis
- unnecessary message queues

Keep the project minimal.

---

# 38. NO UNNECESSARY DEPENDENCIES

Before installing a dependency:

1. Check whether existing dependencies already solve the problem.
2. Prefer built-in NestJS/TypeScript/Node capabilities.
3. Install only when justified.
4. Do not add libraries simply for convenience.

Every new dependency should have a clear purpose.

---

# 39. ENVIRONMENT / SECRETS

Never commit:

- .env
- database passwords
- JWT secrets
- payment gateway secrets
- API keys

Use `.env.example` with variable names only.

Never hardcode secrets.

Never print secrets in logs.

---

# 40. DOCUMENTATION

Keep README updated with:

- project purpose
- architecture
- setup
- environment variables
- PostgreSQL setup
- migration commands
- development commands
- testing commands
- roles/permissions
- payment gateway setup

Documentation must reflect the actual implementation.

Do not document features that do not exist.

---

# 41. FINAL HARDENING BEFORE COMPLETION

Before declaring the backend complete, perform a dedicated review for:

## Database

- migration correctness
- constraints
- indexes
- foreign keys
- monetary types
- duplicate prevention

## Security

- authentication
- authorization
- tenant isolation
- IDOR
- secret handling
- input validation
- webhook security

## Payroll

- calculation correctness
- advance deductions
- duplicate prevention
- concurrency
- finalization
- immutability

## RBAC

- role creation
- permission assignment
- user role assignment
- Owner protection
- cross-tenant authorization

## Subscription

- trial
- expiration
- plan limits
- payment verification
- webhook idempotency

## Code quality

- build
- lint
- tests
- unnecessary dependencies
- duplicated logic

Do not declare success until these checks are actually performed.

---

# 42. MOST IMPORTANT RULE

When there is a conflict between:

- speed
- convenience
- security
- data integrity

choose:

SECURITY + DATA INTEGRITY

over speed or convenience.

When there is a choice between:

- a simple maintainable solution
- a complicated feature-rich solution

choose:

SIMPLE + MAINTAINABLE

unless the more complex solution is genuinely required.

Never sacrifice tenant isolation, authorization, payroll integrity or financial correctness for convenience.
