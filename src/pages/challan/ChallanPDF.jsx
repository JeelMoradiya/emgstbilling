import {
    Page,
    Text,
    View,
    Document,
    StyleSheet,
  } from "@react-pdf/renderer";
  import { format, parseISO } from "date-fns";
  import { numberToWords } from "../../utils/utils";
  
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
      width: "20%", // Adjusted for 5 columns
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: "#e0e0e0",
      backgroundColor: "#2c3e50",
      padding: 6,
    },
    tableCol: {
      width: "20%", // Adjusted for 5 columns
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
  });
  
  const formatAddress = (address) => {
    if (!address || typeof address !== "object") return "N/A";
    const { plotHouseNo, line1, area, landmark, city, state, pincode } = address;
    return [plotHouseNo, line1, area, landmark, city, state, pincode]
      .filter(Boolean)
      .join(", ");
  };
  
  const calculateChallanValues = (challan) => {
    const subtotal = parseFloat(challan.subtotal) || 0;
    const discountAmount = parseFloat(challan.discountAmount) || 0;
    const total = parseFloat(challan.total) || 0;
    const roundedTotal = parseFloat(challan.roundedTotal) || Math.round(total);
    const roundOff = parseFloat(challan.roundOff) || (roundedTotal - total);
  
    return {
      ...challan,
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      total: total.toFixed(2),
      roundedTotal: roundedTotal.toFixed(2),
      roundOff: roundOff.toFixed(2),
      items: challan.items.map((item) => ({
        ...item,
        price: parseFloat(item.price) || 0,
        quantity: parseFloat(item.quantity) || 0,
        hsn: item.hsn || "N/A",
        name: item.name || "N/A",
      })),
    };
  };
  
  const safeFormatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "dd-MM-yyyy");
    } catch (e) {
      console.error("Invalid date format:", dateStr);
      return format(new Date(), "dd-MM-yyyy"); // Fallback to current date
    }
  };
  
  const ChallanPDF = ({ challans = [], user = {} }) => {
    const safeUser = {
      gstNo: user.gstNo || "N/A",
      udyamNo: user.udyamNo || "N/A",
      companyName: user.companyName || "Your Company",
      address: user.address || { city: "N/A", state: "N/A" },
    };
  
    return (
      <Document>
        {challans.map((challan, index) => {
          const safeChallan = calculateChallanValues({
            id: challan.id || "N/A",
            challanNo: challan.challanNo || "N/A",
            date: challan.date || new Date().toISOString(),
            partyDetails: challan.partyDetails || {},
            items: challan.items || [],
            subtotal: parseFloat(challan.subtotal) || 0,
            discount: parseFloat(challan.discount) || 0,
            discountAmount: parseFloat(challan.discountAmount) || 0,
            total: parseFloat(challan.total) || 0,
            roundedTotal: parseFloat(challan.roundedTotal) || 0,
            roundOff: parseFloat(challan.roundOff) || 0,
            notes: challan.notes || "",
          });
  
          return (
            <Page size="A4" style={styles.page} key={index}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>{safeUser.companyName}</Text>
                  <Text style={styles.subtitle}>
                    Address: {formatAddress(safeUser.address)}
                  </Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.invoiceTitle}>Delivery Challan</Text>
                  <Text style={styles.invoiceDetail}>
                    Challan No.: {safeChallan.challanNo}
                  </Text>
                  <Text style={styles.invoiceDetail}>
                    Date: {safeFormatDate(safeChallan.date)}
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
                      Delivered To:
                    </Text>
                    <Text>{safeChallan.partyDetails.companyName || "N/A"}</Text>
                    <Text>GSTIN: {safeChallan.partyDetails.gstNo || "N/A"}</Text>
                    <Text>Mobile: {safeChallan.partyDetails.mobileNo || "N/A"}</Text>
                    <Text>Address: {formatAddress(safeChallan.partyDetails)}</Text>
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
                </View>
                {safeChallan.items.map((item, itemIndex) => (
                  <View
                    style={
                      itemIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlternate
                    }
                    key={itemIndex}
                  >
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>{itemIndex + 1}</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>{item.name}</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>{item.hsn}</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>{item.quantity}</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {Number(item.price).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
  
              <View style={styles.amountSection}>
                <View style={styles.amountBox}>
                  {safeChallan.notes && (
                    <View style={styles.notesBox}>
                      <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                        Additional Notes:
                      </Text>
                      <Text style={{ fontSize: 9, marginTop: 5 }}>
                        {safeChallan.notes}
                      </Text>
                    </View>
                  )}
                  <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                    Amount in Words:
                  </Text>
                  <Text style={{ fontSize: 12, marginTop: 5 }}>
                    {numberToWords(parseFloat(safeChallan.roundedTotal))}
                  </Text>
                </View>
                <View style={styles.amountBox}>
                  <View style={styles.row}>
                    <Text>Subtotal:</Text>
                    <Text>{safeChallan.subtotal}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>Discount ({safeChallan.discount}%):</Text>
                    <Text>{safeChallan.discountAmount}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>Round Off:</Text>
                    <Text>
                      {safeChallan.roundOff === "0.00"
                        ? "0.00"
                        : Math.abs(safeChallan.roundOff).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                      Total:
                    </Text>
                    <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                      {safeChallan.roundedTotal}
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
                    For {safeUser.companyName} Authorized Signatory
                  </Text>
                </View>
              </View>
  
              <View style={styles.footer}>
                <View style={styles.termsSection}>
                  <Text
                    style={{ fontWeight: "bold", color: "#2c3e50", marginBottom: 5 }}
                  >
                    Terms & Conditions:
                  </Text>
                  <Text style={{ fontSize: 8, marginBottom: 2 }}>
                    1) Goods once sold will not be taken back.
                  </Text>
                  <Text style={{ fontSize: 8, marginBottom: 2 }}>
                    2) We are not responsible for any loss during transit.
                  </Text>
                  <Text style={{ fontSize: 8 }}>
                    3) Subject to Surat jurisdiction.
                  </Text>
                </View>
                <View>
                  <Text style={{ textAlign: "right", marginBottom: 5 }}>
                    Generated by: {format(new Date(), "dd-MM-yyyy")}
                  </Text>
                </View>
              </View>
            </Page>
          );
        })}
      </Document>
    );
  };
  
  export default ChallanPDF;