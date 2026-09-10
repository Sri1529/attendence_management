export interface JwtPayload {
  sub: string;
  companyId: string;
  roleId: string;
  type?: 'access' | 'refresh';
}

export class RequestUser {
  userId!: string;
  companyId!: string;
  roleId!: string;
}
