export type Money = {
  value: number;
  currency: 'EUR' | 'CHF';
};

export type FormatOptions = {
  short?: boolean | undefined;
  replaceZero?: boolean | undefined;
};
