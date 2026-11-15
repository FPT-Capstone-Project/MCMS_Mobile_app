export interface AddressParts {
  houseNumber: string;
  street: string;
  ward: string;
  province: string;
}

export function emptyAddressParts(): AddressParts {
  return { houseNumber: '', street: '', ward: '', province: '' };
}

export function parseAddress(address: string | null | undefined): AddressParts {
  const parts = (address ?? '').split(',').map((part) => part.trim());
  if (parts.length >= 4) {
    return {
      houseNumber: parts[0] ?? '',
      street: parts[1] ?? '',
      ward: parts[2] ?? '',
      province: parts.slice(3).join(', '),
    };
  }

  const [houseAndStreet = '', ward = '', ...provinceParts] = parts;
  const houseStreetMatch = houseAndStreet.match(/^(\d+[\da-zA-Z/-]*)(?:\s+(.+))?$/);
  return {
    houseNumber: houseStreetMatch?.[1] ?? '',
    street: houseStreetMatch?.[2] ?? (houseStreetMatch ? '' : houseAndStreet),
    ward,
    province: provinceParts.join(', '),
  };
}

export function formatAddress(address: AddressParts): string {
  const houseAndStreet = [address.houseNumber, address.street]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');

  return [houseAndStreet, address.ward, address.province]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}
