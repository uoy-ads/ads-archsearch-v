// store/modules/MyStoreModule.ts
import { VuexModule, Module, Mutation, Action, RegisterOptions } from "vuex-class-modules";
import axios from 'axios';
import utils from '@/utils/utils';
import { SearchModule } from './Search';
import { titles, descriptions, resultTitles, types } from './Aggregation/static';

export interface iKeyVal {
  key: string,
  val: string,
}

@Module
export class AggregationModule extends VuexModule {
  private searchModule: SearchModule;

  constructor(searchModule: SearchModule, options: RegisterOptions) {
    super(options);
    this.searchModule = searchModule;
  }

  private options: any = {};
  private titles: any = titles;
  private descriptions: any = descriptions;
  private resultTitles: any = resultTitles;
  private types: any[] = types;

  @Action
  async setSearch(payload: any) {
    if (payload.value.search) {

      const searchParams = this.searchModule.getParams;
      const params = { ...{ filterQuery: payload.value.search, filterName: payload.id }, ...searchParams };
      const url = process.env.apiUrl + '/autocompleteFilter';

      try {
        const res = await axios.get(utils.paramsToString(url, params));
        let data = res?.data?.filtered_agg;

        if (utils.objectIsNotEmpty(data)) {
          const value = { ...payload.value, ...{ data } };

          this.updateOptions({ id: payload.id, value });
        }
      } catch (ex) {}
    }
    else {
      this.updateOptions(payload);
    }
  }

  @Action
  setOptionsToDefault() {
    this.clearOptions();
  }

  @Action
  setOptions(payload: any) {
    this.updateOptions(payload);
  }

  @Action
  setActive(payload: any) {
    const params: any = this.searchModule.getParams;

    let { key, value, add } = payload;

    if (params[key]) {
      let aggs = params[key].split('|');

      if (add) {
        aggs.push(value)

      } else {
        aggs = aggs.filter((agg: any) => {
          return String(agg || '').toLowerCase() !== String(value || '').toLowerCase();
        });
      }

      value = aggs.join('|');
    }

    this.searchModule.setSearch({ [key]: value, page: 0 });
  }

  @Mutation
  public updateOptions(payload: any) {
    const { id, value } = payload;
    this.options[id] = value
  }

  @Mutation
  public clearOptions() {
    this.options = {};
  }

  get getTitles(): any {
    return this.titles;
  }

  get getTypes(): any[] {
    return this.types;
  }

  get hasAggs(): boolean {
    return utils.objectIsNotEmpty(this.searchModule.getAggsResult.aggs);
  }

  get getResultTitle() {
    return (key: string) => {
      return this.resultTitles[key] || utils.sentenceCase(utils.splitCase(key));
    }
  }

  get getTitle() {
    return (key: string) => {
      return this.titles[key] || utils.sentenceCase(utils.splitCase(key));
    }
  }

  get getDescription() {
    return (key: string) => {
      return this.descriptions[key] || '';
    }
  }

  get getSorted() {
    const startOrder = [
      'ariadneSubject',
      'derivedSubject',
      'publisher',
      'contributor',
      'nativeSubject'
    ];

    const result = this.searchModule.getAggsResult?.aggs;

    let sorted: any = {};

    if (this.hasAggs) {
      const typesToSkip = ['fields', 'geogrid', 'bbox', 'range'];

      startOrder.forEach((key: string) => sorted[key] = result[key]);

      for (let key in result) {
        if (!sorted[key] && !typesToSkip.includes(key)) {
          sorted[key] = result[key];
        }
      }
    }

    return sorted;
  }

  get getAnyActive() {
    return (key: string, items: string[]) => {
      if (!items) {
        return false;
      }

      return items.some((item: any) => this.getIsActive(key, item.key));
    }
  }

  get getIsActive() {
    return (key: string, bucketKey: string) => {
      const params = this.searchModule.getParams;

      if (params[key]) {
        return params[key].split('|').some((k: any) => {
          return String(k || '').toLowerCase() === String(bucketKey || '').toLowerCase();
        });
      }

      return false;
    }
  }

  get getOptions() {
    return this.options;
  }

  // Used for displaying what user has filtered and/or search on. Not all uri params are valid for this.
  get activeFilters(): Array<iKeyVal> {
    const valid = Object.keys(this.getTitles).concat(['q', 'range', 'derivedSubjectId', 'geogrid', 'responsible', 'periodName', 'bbox']);
    const params = utils.getCopy(this.searchModule.getParams);
    const filters: Array<iKeyVal> = [];

    valid.forEach((key: string) => {
      if (typeof params[key] === 'string') {
        params[key].split('|').forEach((val: string) => {
          val = val.trim();
          if (val) {
            filters.push({ key, val });
          }
        });
      }
    });
    return filters;
  }
}