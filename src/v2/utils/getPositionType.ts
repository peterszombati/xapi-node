import {CMD_FIELD, PositionType} from '../interface/Enum'

export function getPositionType({
                                    cmd,
                                    closed,
                                    close_time,
                                }: {
    cmd: CMD_FIELD
    closed: boolean
    close_time: number
}): PositionType {
    if (cmd === CMD_FIELD.SELL || cmd === CMD_FIELD.BUY) {
        return close_time === null && !closed
            ? PositionType.open
            : PositionType.closed
    } else {
        return cmd === CMD_FIELD.BALANCE || cmd === CMD_FIELD.CREDIT
            ? PositionType.source
            : PositionType.limit
    }
}