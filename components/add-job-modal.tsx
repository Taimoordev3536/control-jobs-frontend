// Thin re-export so existing imports (`@/components/add-job-modal`) keep
// resolving after the modal was modularized into `./add-job-modal/*`. The
// previous monolithic implementation in this file was commented out wholesale,
// which silently broke `<AddJobModal />` consumers (Element type is invalid).
export { default } from "./add-job-modal/main"
export type { AddJobModalProps } from "./add-job-modal/types"
