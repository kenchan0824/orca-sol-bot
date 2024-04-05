function num_to_pct(num) {
    return (num * 100).toFixed(0) + '%';
}

export function format(current, lower, upper) {
    const lower_buffer = 1 - lower / current;
    const upper_buffer =  upper / current - 1;

    const below_lower = 1 - current / lower;
    const above_upper = current / upper - 1;

    if (current < lower) {
        return `⚽️ *\\-${num_to_pct(below_lower)}* 🗑 🗑`;
    } else if (current > upper) {
        return `🗑 🗑 *\\+${num_to_pct(above_upper)}* ⚽️`;
    }
    if (upper_buffer < lower_buffer) {
        return `🗑 ⚽️ *\\+${num_to_pct(upper_buffer)}* 🗑`;
    } else {
        return `🗑 *\\-${num_to_pct(lower_buffer)}* ⚽️ 🗑`;
    }
}
