import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmploymentStatus } from './entities/employee.entity.js';
import { Department, DepartmentStatus } from '../departments/entities/department.entity.js';
import { Designation, DesignationStatus } from '../designations/entities/designation.entity.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto.js';
import { EmployeeQueryDto } from './dto/employee-query.dto.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Designation)
    private readonly designationRepository: Repository<Designation>,
    private readonly auditLogsService: AuditLogsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async create(companyId: string, dto: CreateEmployeeDto, userId?: string) {
    const targetStatus = dto.employmentStatus || EmploymentStatus.ACTIVE;
    if (targetStatus === EmploymentStatus.ACTIVE) {
      await this.subscriptionsService.validateEmployeeLimit(companyId);
    }

    const existingCode = await this.employeeRepository.findOne({
      where: { company_id: companyId, employee_code: dto.employeeCode },
    });

    if (existingCode) {
      throw new BadRequestException(
        'Employee code already exists in your company',
      );
    }

    if (dto.departmentId) {
      const dept = await this.departmentRepository.findOne({
        where: { id: dto.departmentId, company_id: companyId },
      });
      if (!dept || dept.status !== DepartmentStatus.ACTIVE) {
        throw new BadRequestException(
          'Invalid or inactive department for this company',
        );
      }
    }

    if (dto.designationId) {
      const desg = await this.designationRepository.findOne({
        where: { id: dto.designationId, company_id: companyId },
      });
      if (!desg || desg.status !== DesignationStatus.ACTIVE) {
        throw new BadRequestException(
          'Invalid or inactive designation for this company',
        );
      }
    }

    const employee = this.employeeRepository.create({
      company_id: companyId,
      employee_code: dto.employeeCode,
      first_name: dto.firstName,
      last_name: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      joining_date: dto.joiningDate,
      department_id: dto.departmentId || null,
      designation_id: dto.designationId || null,
      employment_status: dto.employmentStatus || EmploymentStatus.ACTIVE,
    });

    const saved = await this.employeeRepository.save(employee);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'EMPLOYEE_CREATE',
      entityType: 'EMPLOYEE',
      entityId: saved.id,
      metadata: { name: `${saved.first_name} ${saved.last_name}`, employeeCode: saved.employee_code },
    });

    return this.findOne(companyId, saved.id);
  }

  async findAll(companyId: string, query: EmployeeQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.employeeRepository
      .createQueryBuilder('emp')
      .leftJoinAndSelect('emp.department', 'department')
      .leftJoinAndSelect('emp.designation', 'designation')
      .where('emp.company_id = :companyId', { companyId });

    if (query.employmentStatus) {
      qb.andWhere('emp.employment_status = :status', {
        status: query.employmentStatus,
      });
    }

    if (query.departmentId) {
      qb.andWhere('emp.department_id = :deptId', {
        deptId: query.departmentId,
      });
    }

    if (query.designationId) {
      qb.andWhere('emp.designation_id = :desgId', {
        desgId: query.designationId,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(emp.employee_code ILIKE :search OR emp.first_name ILIKE :search OR emp.last_name ILIKE :search OR emp.email ILIKE :search OR emp.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('emp.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id, company_id: companyId },
      relations: {
        department: true,
        designation: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeDto, userId?: string) {
    const employee = await this.findOne(companyId, id);

    if (dto.employeeCode && dto.employeeCode !== employee.employee_code) {
      const existing = await this.employeeRepository.findOne({
        where: { company_id: companyId, employee_code: dto.employeeCode },
      });
      if (existing) {
        throw new BadRequestException(
          'Employee code already exists in your company',
        );
      }
      employee.employee_code = dto.employeeCode;
    }

    if (dto.firstName) employee.first_name = dto.firstName;
    if (dto.lastName) employee.last_name = dto.lastName;
    if (dto.email !== undefined) employee.email = dto.email;
    if (dto.phone !== undefined) employee.phone = dto.phone;
    if (dto.joiningDate) employee.joining_date = dto.joiningDate;

    if (dto.departmentId !== undefined) {
      if (dto.departmentId) {
        const dept = await this.departmentRepository.findOne({
          where: { id: dto.departmentId, company_id: companyId },
        });
        if (!dept || dept.status !== DepartmentStatus.ACTIVE) {
          throw new BadRequestException(
            'Invalid or inactive department for this company',
          );
        }
      }
      employee.department_id = dto.departmentId;
    }

    if (dto.designationId !== undefined) {
      if (dto.designationId) {
        const desg = await this.designationRepository.findOne({
          where: { id: dto.designationId, company_id: companyId },
        });
        if (!desg || desg.status !== DesignationStatus.ACTIVE) {
          throw new BadRequestException(
            'Invalid or inactive designation for this company',
          );
        }
      }
      employee.designation_id = dto.designationId;
    }

    if (dto.employmentStatus) {
      employee.employment_status = dto.employmentStatus;
    }

    const saved = await this.employeeRepository.save(employee);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'EMPLOYEE_UPDATE',
      entityType: 'EMPLOYEE',
      entityId: saved.id,
      metadata: { name: `${saved.first_name} ${saved.last_name}`, employeeCode: saved.employee_code },
    });

    return this.findOne(companyId, id);
  }

  async updateStatus(
    companyId: string,
    id: string,
    dto: UpdateEmployeeStatusDto,
    userId?: string,
  ) {
    const employee = await this.findOne(companyId, id);
    if (
      dto.employmentStatus === EmploymentStatus.ACTIVE &&
      employee.employment_status !== EmploymentStatus.ACTIVE
    ) {
      await this.subscriptionsService.validateEmployeeLimit(companyId);
    }
    employee.employment_status = dto.employmentStatus;
    const saved = await this.employeeRepository.save(employee);

    await this.auditLogsService.logAction({
      companyId,
      userId: userId || null,
      action: 'EMPLOYEE_STATUS_UPDATE',
      entityType: 'EMPLOYEE',
      entityId: saved.id,
      metadata: { name: `${saved.first_name} ${saved.last_name}`, status: saved.employment_status },
    });

    return this.findOne(companyId, id);
  }
}
