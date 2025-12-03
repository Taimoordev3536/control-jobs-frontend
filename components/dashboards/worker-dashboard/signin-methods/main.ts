import QrCodeScanner from "./QrCodeScanner"
import GpsSignIn from "./GpsSignIn"
import IpSignIn from "./IpSignIn"
import WebSignIn from "./WebSignIn"

export { QrCodeScanner, GpsSignIn, IpSignIn, WebSignIn }

export type MethodKey = "QRCODE" | "GPS" | "IP" | "WEB"

const methods = {
  QRCODE: QrCodeScanner,
  GPS: GpsSignIn,
  IP: IpSignIn,
  WEB: WebSignIn,
}

export default methods
