// DatePickerComponent.js
import { useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const DatePickerComponent = ({ fechaNacimiento, setFechaNacimiento }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(new Date());

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  const onChange = (event, selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
      setFechaNacimiento(formatDate(selectedDate));
    }
    setShowPicker(Platform.OS === "ios"); // Mantener abierto en iOS
  };
  return (
    <View>
      <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateButton}>
        <Text style={styles.dateButtonText}>{fechaNacimiento || "Selecciona tu fecha"}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onChange}
          textColor="#000000"
          style={styles.datePicker}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => setShowPicker(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowPicker(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={onChange}
                textColor="#000000"
                style={styles.iosDatePicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 50,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'left',
  },
  datePicker: {
    backgroundColor: '#fff',
    color: '#000',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  iosDatePicker: {
    height: 216,
    backgroundColor: '#fff',
    color: '#000',
  },
});

export default DatePickerComponent;