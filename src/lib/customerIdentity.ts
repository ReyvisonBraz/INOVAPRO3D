export function normalizeCustomerName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function uppercaseCustomerName(value: string): string {
  return value.replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

export function normalizeCustomerPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
}

export function customerMatchesSearch(
  customer: {
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    whatsapp?: string;
  },
  search: string,
): boolean {
  const termName = normalizeCustomerName(search);
  const termPhone = normalizeCustomerPhone(search);
  const fullName = normalizeCustomerName(
    customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(" "),
  );
  const phone = normalizeCustomerPhone(customer.phone || customer.whatsapp || "");

  return Boolean(
    (termName && fullName.includes(termName)) ||
    (termPhone.length >= 3 && phone.includes(termPhone)),
  );
}

export function splitCustomerName(firstName: string, lastName: string) {
  const first = uppercaseCustomerName(firstName).trim();
  const last = uppercaseCustomerName(lastName).trim();
  return {
    firstName: first,
    lastName: last,
    fullName: [first, last].filter(Boolean).join(" "),
  };
}
