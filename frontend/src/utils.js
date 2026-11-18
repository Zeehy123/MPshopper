const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

export const formatMoney = (value) => naira.format(Number(value));
