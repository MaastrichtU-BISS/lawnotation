export function downloadAs(json: object, name: string) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(json)], { type: "application/json" })
  );
  a.download = name;
  a.click();
  a.remove();
}
