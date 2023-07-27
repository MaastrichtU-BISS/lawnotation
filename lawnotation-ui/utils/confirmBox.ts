import Swal, { SweetAlertIcon } from "sweetalert2";
export function confirmBox(
  title: string = "Are you sure?",
  text: string = "",
  icon: SweetAlertIcon = "success"
) {
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: "base btn-primary mr-5",
      cancelButton: "base btn-secondary",
    },
    buttonsStyling: false,
  });
  return swalWithBootstrapButtons.fire({
    title: title,
    text: text,
    icon: icon,
    showCancelButton: true,
    confirmButtonText: "Confirm",
  });
}
