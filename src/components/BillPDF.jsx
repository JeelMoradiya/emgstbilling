import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { numberToWords } from "../utils";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#333333",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 25,
    paddingBottom: 12,
    borderBottom: "1.5px solid #1a3c5e",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 20,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a3c5e",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: "#5a6b7a",
    lineHeight: 1.4,
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a3c5e",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  invoiceDetail: {
    fontSize: 10,
    color: "#333333",
    marginBottom: 4,
    fontWeight: "normal",
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginRight: 10,
    marginBottom: 8,
  },
  table: {
    display: "table",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
  },
  tableRowAlternate: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
  },
  tableColHeader: {
    width: "16.66%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#2c3e50",
    padding: 6,
  },
  tableCol: {
    width: "16.66%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 6,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  tableCell: {
    fontSize: 9,
    color: "#333333",
    textAlign: "center",
    flexWrap: "wrap",
    verticalAlign: "middle",
  },
  amountSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 15,
    borderTop: "1px dashed #2c3e50",
  },
  amountBox: {
    width: "48%",
  },
  notesBox: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  bankDetailsBox: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
    marginTop: 5,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 4,
    border: "1px solid #2c3e50",
    marginTop: 10,
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 50,
  },
  signatureBox: {
    width: "48%",
    textAlign: "center",
    borderTop: "1px solid #2c3e50",
    color: "#333333",
  },
  footer: {
    position: "absolute",
    bottom: 10,
    left: 35,
    right: 35,
    fontSize: 9,
    color: "#666666",
    borderTop: "2px solid #2c3e50",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  termsSection: {
    width: "60%",
    textAlign: "left",
  },
  qrCode: {
    width: 50,
    height: 50,
    alignSelf: "flex-end",
  },
});

// Function to calculate bill values, including roundOff
const calculateBillValues = (bill) => {
  // Ensure all amounts are numbers
  const subtotal = parseFloat(bill.subtotal) || 0;
  const discountAmount = parseFloat(bill.discountAmount) || 0;
  const taxableAmount = parseFloat(bill.taxableAmount) || 0;
  const cgst = parseFloat(bill.cgst) || 0;
  const sgst = parseFloat(bill.sgst) || 0;
  const igst = parseFloat(bill.igst) || 0;

  // Calculate total before rounding
  const total = taxableAmount + cgst + sgst + igst;

  // Round to the nearest whole number
  const roundedTotal = Math.round(total);

  // Calculate roundOff
  const roundOff = roundedTotal - total;

  return {
    ...bill,
    total: total.toFixed(2), // Ensure 2 decimal places
    roundedTotal: roundedTotal.toFixed(2), // Ensure 2 decimal places
    roundOff: roundOff.toFixed(2), // Ensure 2 decimal places
  };
};

const formatAddress = (address) => {
  if (!address || typeof address !== "object") return "N/A";
  const { plotHouseNo, line1, area, landmark, city, state, pincode } = address;
  return [plotHouseNo, line1, area, landmark, city, state, pincode]
    .filter(Boolean)
    .join(", ");
};

const BillPDF = ({ bill = {}, user = {} }) => {
  // Calculate correct bill values
  const calculatedBill = calculateBillValues(bill);

  const safeBill = {
    billNo: calculatedBill.billNo || "N/A",
    challanNo: calculatedBill.challanNo || "N/A",
    date: calculatedBill.date || new Date(),
    partyDetails: calculatedBill.partyDetails || {},
    paymentMethod: calculatedBill.paymentMethod || "N/A",
    status: calculatedBill.status || "N/A",
    items: calculatedBill.items || [],
    subtotal: parseFloat(calculatedBill.subtotal) || 0,
    discount: parseFloat(calculatedBill.discount) || 0,
    discountAmount: parseFloat(calculatedBill.discountAmount) || 0,
    taxableAmount: parseFloat(calculatedBill.taxableAmount) || 0,
    gstRate: parseFloat(calculatedBill.gstRate) || 0,
    cgst: parseFloat(calculatedBill.cgst) || 0,
    sgst: parseFloat(calculatedBill.sgst) || 0,
    igst: parseFloat(calculatedBill.igst) || 0,
    total: parseFloat(calculatedBill.total) || 0,
    roundedTotal: parseFloat(calculatedBill.roundedTotal) || calculatedBill.total || 0,
    roundOff: parseFloat(calculatedBill.roundOff) || 0,
    notes: calculatedBill.notes || "",
  };

  const safeUser = {
    gstNo: user.gstNo || "N/A",
    udyamNo: user.udyamNo || "N/A",
    companyName: user.companyName || "N/A",
    address: user.address || {},
    bankDetails: {
      bankName: user.bankDetails?.bankName || "N/A",
      accountName: user.bankDetails?.accountName || "N/A",
      accountNumber: user.bankDetails?.accountNumber || "N/A",
      ifscCode: user.bankDetails?.ifscCode || "N/A",
    },
  };

  // Placeholder QR code URL (replace with actual QR code generation logic if available)
  const qrCodeUrl = "https://via.placeholder.com/50?text=QR"; // Example placeholder

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{safeUser.companyName}</Text>
            <Text style={styles.subtitle}>GSTIN: {safeUser.gstNo}</Text>
            <Text style={styles.subtitle}>UDYAM No.: {safeUser.udyamNo}</Text>
            <Text style={styles.subtitle}>
              Address: {formatAddress(safeUser.address)}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>Tax Invoice</Text>
            <Text style={styles.invoiceDetail}>
              Invoice No.: {safeBill.billNo}
            </Text>
            <Text style={styles.invoiceDetail}>
              Party Challan No.: {safeBill.challanNo}
            </Text>
            <Text style={styles.invoiceDetail}>
              Date: {format(new Date(safeBill.date), "dd-MM-yyyy")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View>
              <Text
                style={{
                  fontWeight: "bold",
                  marginBottom: 5,
                  color: "#2c3e50",
                }}
              >
                Billed To:
              </Text>
              <Text>{safeBill.partyDetails.companyName || "N/A"}</Text>
              <Text>GSTIN: {safeBill.partyDetails.gstNo || "N/A"}</Text>
              <Text>Mobile: {safeBill.partyDetails.mobileNo || "N/A"}</Text>
              <Text>Address: {formatAddress(safeBill.partyDetails)}</Text>
            </View>
            <View>
              <Text
                style={{
                  fontWeight: "bold",
                  marginBottom: 5,
                  color: "#2c3e50",
                }}
              >
                Payment Details:
              </Text>
              <Text>Method: {safeBill.paymentMethod.toUpperCase()}</Text>
              <Text>Status: {safeBill.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>No.</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Item</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>HSN</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Qty</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Price</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Amount</Text>
            </View>
          </View>
          {safeBill.items.map((item, index) => (
            <View
              style={
                index % 2 === 0 ? styles.tableRow : styles.tableRowAlternate
              }
              key={index}
            >
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{index + 1}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.name || "N/A"}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.hsn || "N/A"}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.quantity || 0}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {(item.price || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountBox}>
            {safeBill.notes && (
              <View style={styles.notesBox}>
                <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                  Additional Details:
                </Text>
                <Text style={{ fontSize: 9, marginTop: 5 }}>
                  {safeBill.notes}
                </Text>
              </View>
            )}
            {(safeUser.bankDetails.bankName !== "N/A" ||
              safeUser.bankDetails.accountName !== "N/A" ||
              safeUser.bankDetails.accountNumber !== "N/A" ||
              safeUser.bankDetails.ifscCode !== "N/A") && (
              <View style={styles.bankDetailsBox}>
                <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                  Bank Details:
                </Text>
                {safeUser.bankDetails.bankName !== "N/A" && (
                  <Text style={{ fontSize: 10, marginTop: 5 }}>
                    Bank Name: {safeUser.bankDetails.bankName}
                  </Text>
                )}
                {safeUser.bankDetails.accountName !== "N/A" && (
                  <Text style={{ fontSize: 10, marginTop: 5 }}>
                    Account Name: {safeUser.bankDetails.accountName}
                  </Text>
                )}
                {safeUser.bankDetails.accountNumber !== "N/A" && (
                  <Text style={{ fontSize: 10, marginTop: 5 }}>
                    Account Number: {safeUser.bankDetails.accountNumber}
                  </Text>
                )}
                {safeUser.bankDetails.ifscCode !== "N/A" && (
                  <Text style={{ fontSize: 10, marginTop: 5 }}>
                    IFSC Code: {safeUser.bankDetails.ifscCode}
                  </Text>
                )}
              </View>
            )}
            <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
              Amount in Words:
            </Text>
            <Text style={{ fontSize: 12, marginTop: 5 }}>
              {numberToWords(parseFloat(safeBill.roundedTotal))}
            </Text>
          </View>
          <View style={styles.amountBox}>
            <View style={styles.row}>
              <Text>Subtotal:</Text>
              <Text>{safeBill.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Discount ({safeBill.discount}%):</Text>
              <Text>{safeBill.discountAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Taxable Amount:</Text>
              <Text>{safeBill.taxableAmount.toFixed(2)}</Text>
            </View>
            {safeBill.cgst > 0 && (
              <View style={styles.row}>
                <Text>CGST ({safeBill.gstRate / 2}%):</Text>
                <Text>{safeBill.cgst.toFixed(2)}</Text>
              </View>
            )}
            {safeBill.sgst > 0 && (
              <View style={styles.row}>
                <Text>SGST ({safeBill.gstRate / 2}%):</Text>
                <Text>{safeBill.sgst.toFixed(2)}</Text>
              </View>
            )}
            {safeBill.igst > 0 && (
              <View style={styles.row}>
                <Text>IGST ({safeBill.gstRate}%):</Text>
                <Text>{safeBill.igst.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text>Round Off:</Text>
              <Text>
                {isNaN(safeBill.roundOff) || safeBill.roundOff === 0
                  ? "0.00"
                  : Math.abs(safeBill.roundOff).toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                Total:
              </Text>
              <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                {safeBill.roundedTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={{ marginTop: 12 }}>Receiver's Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ marginTop: 12 }}>
              For {safeUser.companyName || "N/A"} Authorized Signatory
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.termsSection}>
            <Text style={{ fontWeight: "bold", color: "#2c3e50", marginBottom: 5 }}>
              Terms & Conditions:
            </Text>
            <Text style={{ fontSize: 8, marginBottom: 2 }}>
              1) Payment to be made A/c Payee's Cheque only.
            </Text>
            <Text style={{ fontSize: 8, marginBottom: 2 }}>
              2) We are not responsible for any loss during transit.
            </Text>
            <Text style={{ fontSize: 8, marginBottom: 2 }}>
              3) Interest @ 18% p.a will be charged on amount remaining unpaid from the due date.
            </Text>
            <Text style={{ fontSize: 8 }}>
              4) Subject to Surat jurisdiction.
            </Text>
          </View>
          <View>
            <Text style={{ textAlign: "right", marginBottom: 5 }}>
              Generated by: {format(new Date(), "dd-MM-yyyy")}
            </Text>
            <Image src={qrCodeUrl} style={styles.qrCode} />
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default BillPDF;