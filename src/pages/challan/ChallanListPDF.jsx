import {
    Page,
    Text,
    View,
    Document,
    StyleSheet,
    Image,
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
      fontWeight: "bold",
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
      fontWeight: "bold",
      fontSize: 10,
      color: "#5a6b7a",
      lineHeight: 1.4,
      marginTop: 2,
    },
    partyDetails: {
      fontWeight: "bold",
      fontSize: 10,
      color: "#5a6b7a",
      lineHeight: 1.4,
      marginBottom: 4,
      padding: 10,
      backgroundColor: "#e3f2fd",
      borderRadius: 4,
      border: "1px solid #2c3e50",
    },
    section: {
      marginBottom: 20,
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
      width: "14.28%", // Adjusted for 7 columns
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: "#e0e0e0",
      backgroundColor: "#2c3e50",
      padding: 6,
    },
    tableCol: {
      width: "14.28%",
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
      justifyContent: "space-around",
      marginTop: 40,
      paddingHorizontal: 20,
    },
    signatureBox: {
      width: "30%",
      height: 68,
      textAlign: "center",
      border: "1px solid #2c3e50",
      borderRadius: 6,
      backgroundColor: "#f8f9fa",
      padding: 8,
      color: "#333333",
    },
    signatureImage: {
      width: 100,
      height: 30,
      objectFit: "contain",
      margin: "auto",
    },
  });
  
  const calculateChallanValues = (challans) => {
    let totalQty = 0;
    let totalPrice = 0;
    let totalAmount = 0;
    let totalDiscountAmount = 0;
  
    challans.forEach((challan) => {
      challan.items.forEach((item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        totalQty += qty;
        totalPrice += price;
        totalAmount += qty * price;
      });
      const discountAmount = parseFloat(challan.discountAmount) || 0;
      totalDiscountAmount += discountAmount;
    });
  
    return {
      totalQty: totalQty.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      totalDiscountAmount: totalDiscountAmount.toFixed(2),
      netAmount: (totalAmount - totalDiscountAmount).toFixed(2),
    };
  };
  
  const getDateRange = (challans) => {
    if (!challans || challans.length === 0) {
      return {
        fromDate: format(new Date(), "dd-MM-yyyy"),
        toDate: format(new Date(), "dd-MM-yyyy"),
      };
    }
  
    const dates = challans.map((challan) => parseISO(challan.date));
    const fromDate = new Date(Math.min(...dates));
    const toDate = new Date(Math.max(...dates));
  
    return {
      fromDate: format(fromDate, "dd-MM-yyyy"),
      toDate: format(toDate, "dd-MM-yyyy"),
    };
  };
  
  const formatAddress = (address) => {
    if (!address || typeof address !== "object") return "N/A";
    const { plotHouseNo, line1, area, landmark, city, state, pincode } = address;
    return [plotHouseNo, line1, area, landmark, city, state, pincode]
      .filter(Boolean)
      .join(", ");
  };
  
  const ChallanListPDF = ({ challans, user }) => {
    const calculatedValues = calculateChallanValues(challans);
    const { fromDate, toDate } = getDateRange(challans);
    const firstChallan = challans[0] || {};
    const safeUser = {
      gstNo: user.gstNo || "N/A",
      udyamNo: user.udyamNo || "N/A",
      companyName: user.companyName || "N/A",
      address: user.address || {},
      mobileNo: user.mobileNo || "N/A",
      bankDetails: {
        bankName: user.bankDetails?.bankName || "N/A",
        accountName: user.bankDetails?.accountName || "N/A",
        accountNumber: user.bankDetails?.accountNumber || "N/A",
        ifscCode: user.bankDetails?.ifscCode || "N/A",
      },
      signature: user.signature || "",
    };
  
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{safeUser.companyName}</Text>
              <Text style={styles.subtitle}>GSTIN: {safeUser.gstNo}</Text>
              <Text style={styles.subtitle}>
                Contact No.: {safeUser.mobileNo}
              </Text>
              <Text style={styles.subtitle}>
                Address: {formatAddress(safeUser.address)}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.invoiceTitle}>Challans Summary</Text>
              <Text style={styles.invoiceDetail}>
                UDYAM No.: {safeUser.udyamNo}
              </Text>
            </View>
          </View>
  
          <View style={styles.partyDetails}>
            <Text style={styles.invoiceTitle}>Party Details</Text>
            <Text>
              {firstChallan.partyDetails?.companyName || "N/A"}
            </Text>
            <Text>
              Mobile No.: {firstChallan.partyDetails?.mobileNo || "N/A"}
            </Text>
            <Text>
              From Date: {fromDate} to {toDate}
            </Text>
          </View>
  
          <View style={styles.section}>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Challan No</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Date</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>HSN Code</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Qty</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Price</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Discount (%)</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Amount</Text>
                </View>
              </View>
              {challans.map((challan) =>
                challan.items.map((item, index) => (
                  <View
                    style={
                      index % 2 === 0 ? styles.tableRow : styles.tableRowAlternate
                    }
                    key={`${challan.id}-${index}`}
                  >
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {index === 0 ? challan.challanNo : ""}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {index === 0
                          ? format(parseISO(challan.date), "dd/MM/yyyy")
                          : ""}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>{item.hsn || "N/A"}</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>{item.quantity || 0}</Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {(parseFloat(item.price) || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {index === 0 ? (challan.discount || 0).toFixed(2) : ""}
                      </Text>
                    </View>
                    <View style={styles.tableCol}>
                      <Text style={styles.tableCell}>
                        {(
                          (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.price) || 0)
                        ).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <View style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>Total</Text>
                </View>
                <View style={styles.tableCol} />
                <View style={styles.tableCol} />
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {calculatedValues.totalQty}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {calculatedValues.totalPrice}
                  </Text>
                </View>
                <View style={styles.tableCol} />
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {calculatedValues.totalAmount}
                  </Text>
                </View>
              </View>
            </View>
          </View>
  
          <View style={styles.amountSection}>
            <View style={styles.amountBox}>
              <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                Amount in Words:
              </Text>
              <Text style={{ fontSize: 12, marginTop: 5 }}>
                {numberToWords(calculatedValues.netAmount)}
              </Text>
            </View>
            <View style={styles.amountBox}>
              <View style={styles.totalRow}>
                <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                  Net Amount:
                </Text>
                <Text style={{ fontWeight: "bold", color: "#2c3e50" }}>
                  {calculatedValues.netAmount}
                </Text>
              </View>
            </View>
          </View>
  
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 9, marginTop: 4, marginBottom: 4 }}>
                Receiver's Signature
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 9, marginTop: 4 }}>
                For {safeUser.companyName || "N/A"}
              </Text>
              {safeUser.signature &&
              safeUser.signature.startsWith("data:image/") ? (
                <Image src={safeUser.signature} style={styles.signatureImage} />
              ) : (
                <Text
                  style={{
                    fontSize: 9,
                    marginTop: 6,
                    marginBottom: 4,
                    color: "#666666",
                  }}
                >
                  N/A
                </Text>
              )}
              <Text style={{ fontSize: 9, marginBottom: 4 }}>
                Authorized Signatory
              </Text>
            </View>
          </View>
        </Page>
      </Document>
    );
  };
  
  export default ChallanListPDF;