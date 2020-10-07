/**
 * @author Daniel van Dijk <daniel@invidiacreative.net>
 * @since 22072020 Clean up.
 */
class ErrorValueUnexpected extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
        super(message);

        this.name = "HadesErrorValueUnexpected";
    }
}

export { ErrorValueUnexpected };