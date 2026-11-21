export interface AutomaticRentalPackage {
  package_id: number;
  duration_days: number;
}

export function selectAutomaticRentalPackage<T extends AutomaticRentalPackage>(
  growingDays: number,
  packages: readonly T[],
): T | null {
  if (!Number.isInteger(growingDays) || growingDays < 7 || growingDays > 15) {
    return null;
  }

  const durationDays = growingDays <= 9 ? 15 : 20;
  return packages
    .filter((rentalPackage) => rentalPackage.duration_days === durationDays)
    .reduce<T | null>(
      (selected, rentalPackage) =>
        !selected || rentalPackage.package_id < selected.package_id
          ? rentalPackage
          : selected,
      null,
    );
}
