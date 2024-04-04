function num_to_pct(num) {
    return (num * 100).toFixed(0) + '%';
}

export function format(current, lower, upper) {
    const lower_buffer = lower / current - 1;
    const upper_buffer =  upper / current - 1;

    const below_lower = current / lower - 1;
    const above_upper = current / upper - 1;

    if (current < lower) {
        return `(x)  ${num_to_pct(below_lower)}  [   +${num_to_pct(upper_buffer)} ]`;
    } else if (current > upper) {
        return `[ ${num_to_pct(lower_buffer)}   ]  +${num_to_pct(above_upper)}  (x)`;
    }
    return `[ ${num_to_pct(lower_buffer)}  (x)  +${num_to_pct(upper_buffer)} ]`;
}
