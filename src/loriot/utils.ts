import axios from 'axios';

export async function getPaginatedResponse(url: URL, authorization: string, field: string): Promise<any[]> {
  let result: any[] = [];

  for (let page = 1, perPage = 100, total = perPage; result.length < total; page++) {
    url.searchParams.set('perPage', perPage.toString());
    url.searchParams.set('page', page.toString());
    const res = await axios.get(url.toString(), {
      headers: { Authorization: authorization },
    });

    if (res) {
      total = res.data.total;

      const pageResult = res.data[field];
      if (!pageResult) {
        // field not present
        throw new Error(`${url.toString()} field ${field} not found in the response`);
      } else if (pageResult.length == 0) {
        // No documents returned
        if (page <= total / perPage) {
          // The page should return documents
          throw new Error(`${url.toString()} returns 0 ${field} while total is ${total}`);
        } else {
          // The page should be empty
          break;
        }
      } else {
        // Documents returned
        result.push(...pageResult);
      }
    }
  }

  return result;
}
