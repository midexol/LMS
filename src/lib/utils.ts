export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const yyyy = d.getFullYear();
  const mmm = months[d.getMonth()];
  const dd = String(d.getDate()).padStart(2, "0");

  return `${mmm} ${dd}, ${yyyy}`;
}

export function formatNgn(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

