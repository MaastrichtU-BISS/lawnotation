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

// Returns true ("Yes"), false ("No"), or undefined if the user dismissed the
// dialog without picking either (closed/ESC/backdrop) - callers should treat
// undefined as "abort", not as "No".
export async function confirmAnonymizeAnnotators(): Promise<boolean | undefined> {
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton:
        "rounded-md bg-secondary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600",
      denyButton:
        "rounded-md bg-primary ml-5 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600",
    },
    buttonsStyling: false,
  });

  const result = await swalWithBootstrapButtons.fire({
    title: "Anonymize annotators?",
    text: 'If "Yes", annotator emails will be replaced with sequential numbers (starting from 1) in the downloaded report. If "No", real annotator emails will be included.',
    icon: "question",
    showDenyButton: true,
    confirmButtonText: "Yes",
    denyButtonText: "No",
  });

  if (result.isConfirmed) return true;
  if (result.isDenied) return false;
  return undefined;
}
