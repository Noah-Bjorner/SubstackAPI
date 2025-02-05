import { REDIS_RATE_LIMIT_DATABASES } from "../middleware/rateLimit";
import { getErrorMessage } from "./errors";


const REGIONS = {
    AFRICA: "Africa",
    AMERICA: "America",
    ANTARCTICA: "Antarctica",
    ARCTIC: "Arctic",
    ASIA: "Asia",
    ATLANTIC: "Atlantic",
    AUSTRALIA: "Australia",
    EUROPE: "Europe",
    INDIAN: "Indian",
    PACIFIC: "Pacific",
} as const;

const COUNTRIES = {
    UNITED_STATES: "US",
    CANADA: "CA",
    MEXICO: "MX",
    INDIA: "IN",
    PAKISTAN: "PK",
    BANGLADESH: "BD",
    SRI_LANKA: "LK",
    JAPAN: "JP",
    SOUTH_KOREA: "KR",
    TAIWAN: "TW",
    AUSTRALIA: "AU",
    NEW_ZEALAND: "NZ",
} as const;

export const getClosestRateLimitDatabase = (timeZone: string, country: string): REDIS_RATE_LIMIT_DATABASES => {
    try {
        const region = timeZone.split('/')[0] // e.g. Europe
        const location = timeZone.split('/')[1] // e.g. New_York

        //North America
        if (country === COUNTRIES.UNITED_STATES || country === COUNTRIES.CANADA || country === COUNTRIES.MEXICO) {
            if (country === COUNTRIES.MEXICO ) return REDIS_RATE_LIMIT_DATABASES.CALIFORNIA
            const usWestLocations = ["Los_Angeles", "Denver", "San_Francisco", "Seattle", "Portland", "Phoenix", "Las_Vegas", "Boise"]
            const caWestLocations = ["Vancouver", "Calgary", "Edmonton", "Victoria", "Whitehorse", "Yellowknife", "Regina", "Saskatoon"]
            const westLocations = [...usWestLocations, ...caWestLocations]
            return westLocations.includes(location) ? REDIS_RATE_LIMIT_DATABASES.CALIFORNIA : REDIS_RATE_LIMIT_DATABASES.VIRGINIA
        }

        //Europe
        if (region === REGIONS.EUROPE) {
            return REDIS_RATE_LIMIT_DATABASES.GERMANY
        }

        //Asia
        if (country === COUNTRIES.INDIA || country === COUNTRIES.PAKISTAN || country === COUNTRIES.BANGLADESH || country === COUNTRIES.SRI_LANKA) {
            return REDIS_RATE_LIMIT_DATABASES.INDIA
        }

        if (country === COUNTRIES.JAPAN || country === COUNTRIES.SOUTH_KOREA || country === COUNTRIES.TAIWAN) {
            return REDIS_RATE_LIMIT_DATABASES.JAPAN
        }

        if (country === COUNTRIES.AUSTRALIA || country === COUNTRIES.NEW_ZEALAND) {
            return REDIS_RATE_LIMIT_DATABASES.AUSTRALIA
        }

        if (region === REGIONS.ASIA || region === REGIONS.PACIFIC) {
            return REDIS_RATE_LIMIT_DATABASES.SINGAPORE
        }

        //South America
        if (region === REGIONS.AMERICA) {
            return REDIS_RATE_LIMIT_DATABASES.BRAZIL
        }

        //Middle East -> Germany
        //Africa -> Germany

        return REDIS_RATE_LIMIT_DATABASES.GERMANY
    } catch (error) {
        console.error({ event: 'failed_to_get_closest_rate_limit_database', error: getErrorMessage(error), country: country, timeZone: timeZone });
        return REDIS_RATE_LIMIT_DATABASES.GERMANY
    }

}