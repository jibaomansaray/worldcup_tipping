import { AppDataSource } from "../data-source"
import { Country } from "../entity/Country"
import { year as configYear } from '../games/parser/parse_config'

export const getCountryRepo = () => {
  return AppDataSource.getRepository(Country);
}
export const getAllCountries = async (year = configYear) => {
  return await getCountryRepo().createQueryBuilder('country')
    .where('country.year = :year', { year })
    .orderBy('country.internalId', 'ASC')
    .getMany()
}

export const findCountryById = async (countryId: number) => {
  return await getCountryRepo().findOne({ where: { id: countryId } });
}

export const updateCountry = async (countryId: number, data: Record<string, unknown>) => {
  const country = await findCountryById(countryId)
  if (country) {
    await getCountryRepo().update({
      id: country.id
    }, data)

    return {
      success: true,
      country: await findCountryById(country.id)
    }
  }

  return {
    success: false,
    code: 'country_not_found',
    message: `country with ID ${countryId} not found`,
    country: null
  }
}