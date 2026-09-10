export enum AbsenceDeductionMode {
  AUTOMATIC = "AUTOMATIC",
  MANUAL = "MANUAL",
}

export interface CompanySettings {
  id: string;
  name: string;
  absence_deduction_mode?: AbsenceDeductionMode;
  created_at: string;
  updated_at?: string;
}
