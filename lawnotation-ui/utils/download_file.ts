export function downloadAs(data: string | Blob, name: string, format: string = "application/json") {
  var a = document.createElement("a");
  const blob = (typeof data === "string") ? new Blob([data], { type: format }) : data;
  a.href = URL.createObjectURL(
    blob
  );
  a.download = name;
  a.click();
  a.remove();
}
