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
    marginBottom: 30,
    borderBottom: "2px solid #1976d2",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1976d2",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 9,
    color: "#666666",
    marginTop: 3,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    backgroundColor: "#1976d2",
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
    // Remove any potential superscript or special formatting
    verticalAlign: "middle",
  },
  amountSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 15,
    borderTop: "1px dashed #1976d2",
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
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 4,
    border: "1px solid #1976d2",
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
    borderTop: "1px solid #1976d2",
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
    borderTop: "2px solid #1976d2",
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
    total: bill.total || 0,
    notes: bill.notes || "",
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
          <View>
            <Text style={styles.title}>{safeUser.companyName}</Text>
            <Text style={styles.subtitle}>GSTIN: {safeUser.gstNo}</Text>
            <Text style={styles.subtitle}>
              Address: {formatAddress(safeUser.address)}
            </Text>
          </View>
          <View>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 13,
                color: "#1976d2",
                marginTop: 2,
                marginBottom: 3,
              }}
            >
              TAX INVOICE
            </Text>
            <Text style={{ fontSize: 11, color: "#333333" }}>
              Invoice No.: {safeBill.billNo}
            </Text>
            <Text style={{ fontSize: 11, color: "#333333" }}>
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
                  color: "#1976d2",
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
                  color: "#1976d2",
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
                  {item.price || 0}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {(item.quantity || 0) * (item.price || 0)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountBox}>
            {safeBill.notes && (
              <View style={styles.notesBox}>
                <Text style={{ fontWeight: "bold", color: "#1976d2" }}>
                  Additional Notes:
                </Text>
                <Text style={{ fontSize: 9, marginTop: 5 }}>
                  {safeBill.notes}
                </Text>
              </View>
            )}
            <Text style={{ fontWeight: "bold", color: "#1976d2" }}>
              Amount in Words:
            </Text>
            <Text style={{ fontSize: 9, marginTop: 5 }}>
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
            <View style={styles.row}>
              <Text>CGST ({safeBill.gstRate / 2}%):</Text>
              <Text>{safeBill.cgst.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text>SGST ({safeBill.gstRate / 2}%):</Text>
              <Text>{safeBill.sgst.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: "bold", color: "#1976d2" }}>
                Total:
              </Text>
              <Text style={{ fontWeight: "bold", color: "#1976d2" }}>
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
