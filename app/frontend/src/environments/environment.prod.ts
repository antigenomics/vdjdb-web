export const environment = {
    production:  true,
    application: {
        annotations: {
            filters: {
                hammingDistance: {
                    allowIndels: false,
                    range:       { min: 0, max: 3 }
                }
            }
        }
    }
};
