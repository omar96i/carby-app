import { StyleSheet } from 'react-native';

export default StyleSheet.create({
        safeContainer: {
          flex: 1,
          backgroundColor: "#fff",
        },
        container: {
          flex: 1,
          padding: 20,
        },
        backButton: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          width: 375,
          height: 48,
          marginTop: 30,
          alignSelf: "flex-start",
        },
        stepsContainer: {
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          marginBottom: 20,
          paddingVertical: 10,
        },
        stepItem: {
          alignItems: "center",
          flexDirection: "column",
          marginHorizontal: 15, // Separa los pasos
        },
        step: {
          textAlign: "center",
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: "#000", // Texto en negro
          marginBottom: -5,
          marginTop: 13, // Espacio entre el icono y el texto
          lineHeight: 22,
        },
        stepDivider: {
          height: 20,
        },
        sectionTitle1: {
          fontFamily: "Inter_700Bold",
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 35,
          marginTop: -5,
        },
        locationBox: {
          marginTop: -25,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "#999",
          borderRadius: 20,
          padding: 15,
          marginBottom: 30,
          minHeight: 120,
        },
        locationItem: {
          marginBottom: 20,
        },
        locationRow: {
          flexDirection: "row",
          alignItems: "center",
        },
        pointTitle: {
          fontSize: 18,
          fontWeight: "bold",
          marginLeft: 5,
        },
        pointSubtitle: {
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: "#777",
          paddingLeft: 25,
        },
        pointAddress: {
          fontFamily: "Inter_400Regular",
          color: "#000000",
          fontSize: 14,
          paddingLeft: 25,
        },
        addButton: {
          marginLeft: "auto",
          padding: 5,
          borderRadius: 5,
        },
        dottedLineContainer: {
          position: "absolute",
          left: 6, // Ajusta según necesidad
          top: 40,
          height: 50, // Aumentar la longitud de la línea
          width: 2, // Mantiene la línea delgada
          overflow: "hidden", // Evita que el degradado se desborde
        },
        dottedLine: {
          height: "100%",
          top: 0, // Reduce este valor para subir la línea
          borderLeftWidth: 2,
          borderStyle: "dashed",
          borderColor: "#fde2cc",
        },
        footer: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: -20,
        },
        price: {
          marginTop: 40,
          fontFamily: "Inter_400Regular",
          fontSize: 15,
          color: "#777",
        },
        priceValue: {
          fontSize: 22,
          fontWeight: "bold",
          color: "#fa6205",
        },
        continueButton: {
          backgroundColor: "#fa6205",
          padding: 15,
          borderRadius: 50,
          alignItems: "center",
          width: 140, // Ajusta el ancho
          height: 50, // Ajusta la altura
          marginTop: 40,
        },
        continueText: {
          color: "#1C1C1E",
          fontSize: 14,
          fontFamily: "Inter_400Regular",
        },
        title: {
          fontFamily: "Inter_700Bold",
          fontSize: 19,
          fontWeight: "bold",
          marginBottom: 10,
          marginTop: -5,
          color: "#007C21",
        },
        input: {
          backgroundColor: '#fdf0e6',
          padding: 10,
          borderRadius: 8,
          marginBottom: 10,
        },
        input2: {
          backgroundColor: '#fdf0e6',
          padding: 10,
          borderRadius: 8,
          marginBottom: 0,
          textAlignVertical: 'top',
        },
        sectionTitle2: {
          fontFamily: "Inter_700Bold",
          fontSize: 18,
          fontWeight: "bold",
          color: "#888",
          marginBottom: 10,
          marginTop: -30,
          left: 15,
        },
        sectionTitle3: {
          fontFamily: "Inter_700Bold",
          fontSize: 18,
          fontWeight: "bold",
          color: "#888",
          marginBottom: 10,
          marginTop: -10,
          left: 15,
        },
        card: {
          backgroundColor: "#fa6205",
          borderRadius: 10,
          padding: 15,
          marginBottom: 20,
        },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 5,
        },
        label: {
          fontSize: 12,
          color: "#1C1C1E",
          fontFamily: "Inter_400Regular",
        },
        value: {
          fontSize: 12,
          color: "#1C1C1E",
          fontFamily: "Inter_400Regular",
        },
        paymentContainer: {
          marginVertical: 10,
          marginTop: 0,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "#999",
          borderRadius: 20,
          padding: 15,
          marginBottom: 30,
          minHeight: 120,
        },
        paymentOption: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between", // Distribuye los elementos
          padding: 15,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          marginBottom: 10,
          backgroundColor: "#fff",
        },
        paymentText: {
          flex: 1,
          fontSize: 16,
          marginLeft: 10,
          color: "#333",
        },
        modalContent: {
          backgroundColor: "white",
          padding: 20,
          borderRadius: 10,
          alignItems: "center",
        },
        subtitle: {
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: "#ECECEC",
          textAlign: "center",
          marginBottom: 20,
        },
        button: {
          backgroundColor: "#007C21",
          paddingVertical: 10,
          paddingHorizontal: 100,
          borderRadius: 5,
          padding: 15,
          borderRadius: 15,
          alignItems: "center",
        },
        buttonText: {
          fontFamily: "Inter_400Regular",
          color: "#1C1C1E",
          fontSize: 16,
          textAlign: "center", // Centra el texto
        },
      });