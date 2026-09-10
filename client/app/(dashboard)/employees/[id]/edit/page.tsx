"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { employeesApi } from "@/lib/api/employees";
import { departmentsApi } from "@/lib/api/departments";
import { designationsApi } from "@/lib/api/designations";
import { Department, Designation, Employee } from "@/types/organization";
import { ArrowLeft, Edit2, AlertCircle } from "lucide-react";

export default function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;
  const router = useRouter();
  const { toast } = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [emp, deptRes, desgRes] = await Promise.all([
          employeesApi.get(employeeId),
          departmentsApi.list({ limit: 100 }),
          designationsApi.list({ limit: 100 }),
        ]);

        setEmployee(emp);
        setFirstName(emp.first_name);
        setLastName(emp.last_name);
        setEmail(emp.email || "");
        setPhone(emp.phone || "");
        setJoiningDate(emp.joining_date ? emp.joining_date.split("T")[0] : "");
        setDepartmentId(emp.department_id || "");
        setDesignationId(emp.designation_id || "");

        // Include active departments/designations or the currently assigned department/designation
        setDepartments(deptRes.data.filter((d) => d.status === "ACTIVE" || d.id === emp.department_id));
        setDesignations(desgRes.data.filter((d) => d.status === "ACTIVE" || d.id === emp.designation_id));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load employee details.";
        setLoadError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!firstName.trim() || !lastName.trim() || !joiningDate) {
      setSubmitError("First Name, Last Name, and Joining Date are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await employeesApi.update(employeeId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        joiningDate,
        departmentId: departmentId || undefined,
        designationId: designationId || undefined,
      });

      toast.success(
        "Employee Updated",
        `${updated.first_name} ${updated.last_name}'s record was updated.`
      );
      router.push(`/employees/${employeeId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update employee.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="lg" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground">Loading employee record...</p>
      </PageContainer>
    );
  }

  if (loadError || !employee) {
    return (
      <PageContainer maxWidth="lg" className="py-6">
        <ErrorState
          title="Employee Not Found"
          message={loadError || "The requested employee record could not be loaded."}
          onRetry={() => router.push("/employees")}
          retryText="Return to Employees List"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="lg" className="py-6">
      <PageHeader
        title={`Edit Employee — ${employee.employee_code}`}
        description={`Update record details for ${employee.first_name} ${employee.last_name}.`}
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push(`/employees/${employeeId}`)}
          >
            Cancel Edit
          </Button>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Edit Employee Profile</CardTitle>
              <CardDescription>
                Employee Code: <span className="font-mono font-bold text-foreground">{employee.employee_code}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {submitError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />

              <Input
                label="Last Name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="email@company.com"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
              <Select
                label="Department"
                placeholder="Select Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />

              <Select
                label="Designation"
                placeholder="Select Designation"
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                options={designations.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/employees/${employeeId}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageContainer>
  );
}
