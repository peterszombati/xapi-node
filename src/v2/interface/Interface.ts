import {TradeRecord} from "../core/TradeRecord"
import {Time} from "../utils/Time"
import {REQUEST_STATUS_FIELD} from "./Enum"

export interface TradePositions {
    [position: number]: {
        value: TradeRecord | null
        lastUpdated: Time
    }
}

export interface TradeStatus {
    customComment: string | null
    message: string | null
    order: number
    requestStatus: REQUEST_STATUS_FIELD | null
}