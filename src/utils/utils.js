export function numberToWords(num) {
    const single = [
      "Zero",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const double = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const formatTenth = (digit, prev) => {
      return 0 == digit ? "" : " " + (1 == digit ? double[prev] : tens[digit]);
    };
    const formatOther = (digit, next, denom) => {
      return (
        (0 != digit && 1 != next ? " " + single[digit] : "") +
        (0 != next || digit > 0 ? " " + denom : "")
      );
    };
  
    let str = "";
    let rupees = Math.floor(num);
    let paise = Math.round((num - rupees) * 100);
  
    str += rupees > 0 ? convertNumber(rupees) + " Rupees" : "";
    str +=
      paise > 0 ? (str ? " and " : "") + convertNumber(paise) + " Paise" : "";
    return str || "Zero Rupees";
  
    function convertNumber(num) {
      if (num < 10) return single[num];
      if (num < 20) return double[num - 10];
      if (num < 100)
        return (
          tens[Math.floor(num / 10)] + (num % 10 ? " " + single[num % 10] : "")
        );
      if (num < 1000)
        return (
          single[Math.floor(num / 100)] +
          " Hundred" +
          (num % 100 ? " and " + convertNumber(num % 100) : "")
        );
      if (num < 100000)
        return (
          convertNumber(Math.floor(num / 1000)) +
          " Thousand" +
          (num % 1000 ? " " + convertNumber(num % 1000) : "")
        );
      if (num < 10000000)
        return (
          convertNumber(Math.floor(num / 100000)) +
          " Lakh" +
          (num % 100000 ? " " + convertNumber(num % 100000) : "")
        );
      return (
        convertNumber(Math.floor(num / 10000000)) +
        " Crore" +
        (num % 10000000 ? " " + convertNumber(num % 10000000) : "")
      );
    }
  }
  
  export const formatAddress = (address) => {
    if (!address || typeof address !== "object") return "N/A";
    const { plotHouseNo, line1, area, landmark, city, state, pincode } = address;
    return [plotHouseNo, line1, area, landmark, city, state, pincode]
      .filter(Boolean) // Remove undefined or empty values
      .join(", ");
  };
  