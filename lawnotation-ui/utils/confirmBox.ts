import Swal from "sweetalert2";
import type { SweetAlertIcon } from "sweetalert2";
export function confirmBox(
  title: string = "Are you sure?",
  text: string = "",
  icon: SweetAlertIcon = "success"
) {
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton:
        "rounded-md bg-secondary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600",
      cancelButton:
        "rounded-md bg-primary ml-5 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600",
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
