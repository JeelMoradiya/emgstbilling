import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
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
    marginTop: 10,
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
    marginTop: 40,
  },
  signatureBox: {
    width: "48%",
    textAlign: "center",
    borderTop: "1px solid #2c3e50",
    paddingTop: 10,
    color: "#333333",
  },
  footer: {
    position: "absolute",
    bottom: 10,
    left: 35,
    right: 35,
    textAlign: "right",
    fontSize: 9,
    color: "#666666",
    borderTop: "2px solid #2c3e50",
    paddingTop: 5,
  },
});

const formatAddress = (address) => {
  if (!address || typeof address !== "object") return "N/A";
  const { plotHouseNo, line1, area, landmark, city, state, pincode } = address;
  return [plotHouseNo, line1, area, landmark, city, state, pincode]
    .filter(Boolean)
    .join(", ");
};

const BillPDF = ({ bill = {}, user = {} }) => {
  const safeBill = {
    billNo: bill.billNo || "N/A",
    challanNo: bill.challanNo || "N/A",
    date: bill.date || new Date(),
    partyDetails: bill.partyDetails || {},
    paymentMethod: bill.paymentMethod || "N/A",
    status: bill.status || "N/A",
    items: bill.items || [],
    subtotal: bill.subtotal || 0,
    discount: bill.discount || 0,
    discountAmount: bill.discountAmount || 0,
    taxableAmount: bill.taxableAmount || 0,
    gstRate: bill.gstRate || 0,
    cgst: bill.cgst || 0,
    sgst: bill.sgst || 0,
    igst: bill.igst || 0,
    total: bill.total || 0,
    notes: bill.notes || "",
    bankName: bill.bankName || "N/A",
    accountName: bill.accountName || "N/A",
    accountNumber: bill.accountNumber || "N/A",
    ifscCode: bill.ifscCode || "N/A",
  };

  const safeUser = {
    gstNo: user.gstNo || "N/A",
    companyName: user.companyName || "N/A",
    address: user.address || {},
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{safeUser.companyName}</Text>
            <Text style={styles.subtitle}>GSTIN: {safeUser.gstNo}</Text>
            <Text style={styles.subtitle}>UDYAM Number</Text>
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
              {/* <Text
                style={{
                  fontWeight: "bold",
                  marginBottom: 5,
                  color: "#2c3e50",
                }}
              >
                Payment Details:
              </Text>
              <Text>Method: {safeBill.paymentMethod.toUpperCase()}</Text> */}
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
                  {item.price.toFixed(2) || 0}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {(item.quantity || 0) * (item.price || 0).toFixed(2)}
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
                  Additional Notes:
                </Text>
                <Text style={{ fontSize: 9, marginTop: 5 }}>
                  {safeBill.notes}
                </Text>
              </View>
            )}
            {(safeBill.bankName ||
              safeBill.accountName ||
              safeBill.accountNumber ||
              safeBill.ifscCode) && (
              <View style={styles.bankDetailsBox}>
                <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                  Bank Details:
                </Text>
                {safeBill.bankName !== "N/A" && (
                  <Text style={{ fontSize: 10, marginTop: 5 }}>
                    Bank Name: {safeBill.bankName}
                  </Text>
                )}
                {safeBill.accountName !== "N/A" && (
                  <Text style={{ fontSize: 10, marginTop: 5 }}>
                    Account Name: {safeBill.accountName}
                  </Text>
                )}
                {safeBill.accountNumber !== "N/A" && (
                  <Text style={{ fontSize: 10, marginTop: 5 }}>
                    Account Number: {safeBill.accountNumber}
                  </Text>
                )}
                {safeBill.ifscCode !== "N/A" && (
                  <Text style={{ fontSize: 10, marginTop: 5 }}>
                    IFSC Code: {safeBill.ifscCode}
                  </Text>
                )}
              </View>
            )}
            <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
              Amount in Words:
            </Text>
            <Text style={{ fontSize: 12, marginTop: 5 }}>
              {numberToWords(safeBill.total)}
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
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                Total:
              </Text>
              <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                {safeBill.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 9 }}>Receiver's Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 9 }}>
              Authorized Signatory ({safeUser.companyName})
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.subtitle}>
            Generated on: {format(new Date(), "dd-MM-yyyy")}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default BillPDF;
