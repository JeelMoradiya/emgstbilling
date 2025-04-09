import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { numberToWords } from "../utils";

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#212121",
    backgroundColor: "#fafafa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 35,
    borderBottom: "2px solid #0288d1",
    paddingBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#0288d1",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    color: "#757575",
    marginTop: 4,
  },
  section: {
    marginBottom: 30,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
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
    backgroundColor: "#e3f2fd",
  },
  tableColHeader: {
    width: "16.66%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#0288d1",
    padding: 5,
  },
  tableCol: {
    width: "16.66%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  tableCell: {
    fontSize: 10,
    color: "#424242",
    textAlign: "center",
  },
  amountSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    paddingTop: 20,
    borderTop: "2px dashed #0288d1",
  },
  amountBox: {
    width: "48%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#e3f2fd",
    borderRadius: 4,
    border: "1px solid #0288d1",
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 60,
  },
  signatureBox: {
    width: "48%",
    textAlign: "center",
    borderTop: "1px solid #0288d1",
    paddingTop: 12,
    color: "#424242",
  },
});

const formatAddress = (address) => {
  if (!address || typeof address !== "object") return "N/A";
  const { plotHouseNo, line1, area, landmark, city, state, pincode } = address;
  return [
    plotHouseNo,
    line1,
    area,
    landmark,
    city,
    state,
    pincode,
  ]
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
    gstRate: bill.gstRate || 0,
    cgst: bill.cgst || 0,
    sgst: bill.sgst || 0,
    total: bill.total || 0,
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
            <Text style={styles.subtitle}>
              Generated on: {format(new Date(), "dd/MM/yyyy")}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 12, color: "#424242" }}>
              Invoice #: {safeBill.billNo}
            </Text>
            <Text style={{ fontSize: 12, color: "#424242" }}>
              Date: {new Date(safeBill.date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View>
              <Text
                style={{
                  fontWeight: "bold",
                  marginBottom: 6,
                  color: "#0288d1",
                }}
              >
                Billed To:
              </Text>
              <Text>Company Name: {safeBill.partyDetails.companyName || "N/A"}</Text>
              <Text>GSTIN: {safeBill.partyDetails.gstNo || "N/A"}</Text>
              <Text>Mobile: {safeBill.partyDetails.mobileNo || "N/A"}</Text>
              <Text>Address: {formatAddress(safeBill.partyDetails)}</Text>
            </View>
            <View>
              <Text
                style={{
                  fontWeight: "bold",
                  marginBottom: 6,
                  color: "#0288d1",
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
                  ₹{(item.price || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountBox}>
            <Text style={{ fontWeight: "bold", color: "#0288d1" }}>
              Amount in Words:
            </Text>
            <Text style={{ fontSize: 11, marginTop: 6, color: "#424242" }}>
              {numberToWords(safeBill.total)}
            </Text>
          </View>
          <View style={styles.amountBox}>
            <View style={styles.row}>
              <Text>Subtotal:</Text>
              <Text>₹{safeBill.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text>CGST ({safeBill.gstRate / 2}%):</Text>
              <Text>₹{safeBill.cgst.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text>SGST ({safeBill.gstRate / 2}%):</Text>
              <Text>₹{safeBill.sgst.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: "bold", color: "#0288d1" }}>
                Total:
              </Text>
              <Text style={{ fontWeight: "bold", color: "#0288d1" }}>
                ₹{safeBill.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 11 }}>Receiver's Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 11 }}>Authorized Signatory</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default BillPDF;