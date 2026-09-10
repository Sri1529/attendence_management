"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { employeesApi } from "@/lib/api/employees";
import { departmentsApi } from "@/lib/api/departments";
import { designationsApi } from "@/lib/api/designations";
import { Department, Designation, EmploymentStatus } from "@/types/organization";
import { ArrowLeft, UserPlus, AlertCircle } from "lucide-react";

export default function NewEmployeePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  // Form State
  const [employeeCode, setEmployeeCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(EmploymentStatus.ACTIVE);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [deptRes, desgRes] = await Promise.all([
          departmentsApi.list({ limit: 100 }),
          designationsApi.list({ limit: 100 }),
        ]);
        // Filter active departments and designations as required by backend
        setDepartments(deptRes.data.filter((d) => d.status === "ACTIVE"));
        setDesignations(desgRes.data.filter((d) => d.status === "ACTIVE"));
      } catch {
        setError("Failed to load department or designation choices.");
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    loadDropdowns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeCode.trim() || !firstName.trim() || !lastName.trim() || !joiningDate) {
      setError("Please fill in all required fields (Employee Code, First Name, Last Name, Joining Date).");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await employeesApi.create({
        employeeCode: employeeCode.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        joiningDate,
        departmentId: departmentId || undefined,
        designationId: designationId || undefined,
        employmentStatus,
      });

      toast.success(
        "Employee Added",
        `${created.first_name} ${created.last_name} (${created.employee_code}) was registered.`
      );
      router.push(`/employees/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create employee.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer maxWidth="lg" className="py-6">
      <PageHeader
        title="Add New Employee"
        description="Register a new employee record within your company."
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/employees")}
          >
            Back to Employees
          </Button>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Employee Personal Details</CardTitle>
              <CardDescription>
                Fields marked with an asterisk (*) are required.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Employee Code"
                required
                placeholder="e.g. EMP-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
              />

              <Input
                label="First Name"
                required
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />

              <Input
                label="Last Name"
                required
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="john.doe@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 555-0192"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                label="Joining Date"
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-4">
              <Select
                label="Department"
                placeholder={isLoadingDropdowns ? "Loading..." : "Select Department"}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />

              <Select
                label="Designation"
                placeholder={isLoadingDropdowns ? "Loading..." : "Select Designation"}
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                options={designations.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />

              <Select
                label="Initial Status"
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                options={[
                  { value: EmploymentStatus.ACTIVE, label: "ACTIVE" },
                  { value: EmploymentStatus.INACTIVE, label: "INACTIVE" },
                  { value: EmploymentStatus.ON_NOTICE, label: "ON NOTICE" },
                ]}
              />
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/employees")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Save Employee Record
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageContainer>
  );
}
