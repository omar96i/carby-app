const NOMBRES = {
  usuario: "Usuario",
  comercio: "Comercio",
  "rider.moto": "Moto",
  "rider.taxi": "Particular",
  "rider.mototaxi": "Mototaxi",
};

export default function nombreRol(tipo) {
  if (!tipo) return "";
  return NOMBRES[tipo] || tipo;
}
