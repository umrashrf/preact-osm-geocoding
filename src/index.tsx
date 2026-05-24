import * as React from 'preact'
import { useState, useRef } from 'preact/hooks';
import './styles.module.css';

interface Props {
  id?: string,
  name?: string,
  placeholder?: string,
  disabled?: boolean,
  debounce?: number,
  callback?: Function,
  onBlur?: Function,
  city?: string,
  countrycodes?: string,
  acceptLanguage?: string,
  viewbox?: string,
  outerClassNames?: string,
  inputClassNames?: string,
  loaderClassNames?: string,
  resultsClassNames?: string,
  resultClassNames?: string,
}

export interface Result {
  address: {
    'ISO3166-2-lvl4'?: string,
    city?: string,
    town?: string,
    state?: string,
    country?: string,
    country_code?: string,
    county?: string,
    region?: string,
    municipality?: string,
    village?: string,
    aeroway?: string,
  },
  boundingbox: Array<string>,
  display_name: string,
  lat: string,
  lon: string
}

export interface Error {
  msg: string,
}

export class debouncedMethod<T> {
  constructor(method: T, debounceTime: number) {
    this._method = method;
    this._debounceTime = debounceTime;
  }
  private _method: T;
  private _timeout: number;
  private _debounceTime: number;
  public invoke: T = ((...args: any[]) => {
    this._timeout && window.clearTimeout(this._timeout);
    this._timeout = window.setTimeout(() => {
      (this._method as any)(...args);
    }, this._debounceTime);
  }) as any;
}

const renderResults = (results: any, errors: any, callback: Function | undefined, dispatch: (value: boolean) => void, resultsClassNames: string = "results", resultClassNames: string = "result") =>
  <div className={resultsClassNames}>
    {errors.map((error: Error, index: number) =>
      <div key={'error' + index} className={resultClassNames}>
        {error?.msg}
      </div>
    )}
    {results.map((result: Result, index: number) =>
      <div key={'result' + index} className={resultClassNames} onClick={() => {
        if (callback) {
          callback(result, errors);
          dispatch(false);
        }
      }}>
        {result?.display_name}
      </div>
    )}
  </div>


export const ReactOsmGeocoding = ({ id = "", name = "", placeholder = "Enter address", disabled = false, debounce = 1000, callback, onBlur = () => { }, city = "", acceptLanguage = "en", viewbox = "", outerClassNames = "reactOsmGeocoding", inputClassNames = "", loaderClassNames = "loader", resultsClassNames = "results", resultClassNames = "result" }: Props) => {
  const [results, setResults] = useState<Partial<Result[]>>([]);
  const [errors, setErrors] = useState<Partial<Error[]>>([]);
  const [showResults, setShowResults] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [httpControllers, setHttpControllers] = useState<Partial<AbortController[]>>([]);

  document.addEventListener('click', function (event) {
    var isClickInside = mainContainerRef?.current?.contains(event.target as Node);
    if (!isClickInside) {
      setShowResults(false);
    }
  });

  document.onkeyup = function (event) {
    if (event.key === "Escape") {
      setShowResults(false);
    }
  }

  function clearHttpRequests() {
    if (httpControllers && httpControllers.length > 0) {
      httpControllers.forEach(httpController => httpController?.abort());
      setHttpControllers([]);
    }
  }

  function getGeocoding(address = "") {
    if (address.length === 0) return;

    setShowLoader(true);

    let url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=${acceptLanguage}`;

    if (city) {
      url = `${url}&street=${address}&city=${city}`;
    } else {
      url = `${url}&q=${address}`
    }

    // if (countrycodes) {
    //   url = `${url}&countrycodes=${countrycodes}`;
    // }

    if (viewbox.length)
      url = `${url}&viewbox=${viewbox}&bounded=1`;

    clearHttpRequests();

    const controller = new AbortController();
    const signal = controller.signal;

    fetch(url, { signal })
      .then(response => {
        clearHttpRequests();
        if (response.ok) return response.json();
        return [];
      })
      .then((data) => {
        const filterByCity = data.filter((result: Result) => {
          if (!result) return false;
          if (!result.hasOwnProperty('address') || !result.address) return false;

          const address = result.address;
          const city = address?.city ?? address?.town ?? address?.municipality ?? address?.village ?? address?.aeroway ?? null;
          if (!city || city === undefined) {
            return false;
          }

          return true;
        });

        setResults(filterByCity);
        setShowResults(true);
      })
      .catch(err => {
        console.warn(err);
        if (err.name !== "AbortError") {
          setResults([]);
          setErrors([{ msg: "Too fast - Try again in a few minutes" }]);
          setShowResults(true);
        }
      })
      .finally(() => setShowLoader(false));

    setHttpControllers([...httpControllers, controller]);
  }

  var debouncer = new debouncedMethod((address: string) => {
    getGeocoding(address);
  }, debounce);



  return <div className={outerClassNames} ref={mainContainerRef}>
    <input
      id={id}
      name={name}
      type="text"
      placeholder={placeholder}
      disabled={disabled}
      className={inputClassNames}
      onClick={() => setShowResults(true)}
      onKeyUp={event => {
        const target = event.target as HTMLTextAreaElement;
        if (!target.value || target.value.length === 0) {
          setShowResults(false);
          setResults([]);
        } else {
          debouncer.invoke(target.value);
        }
      }}
      onBlur={event => onBlur(event)}
      autocomplete="off"
      data-1p-ignore
      data-lpignore="true"
      data-protonpass-ignore="true" />
    <div className={showLoader ? loaderClassNames : "hidden"}>Loading...</div>
    {((results.length || errors.length > 0) && showResults) ? renderResults(results, errors, callback, (toggle) => {
      setShowResults(toggle);
      if (!toggle) {
        setResults([]);
      }
    }, resultsClassNames, resultClassNames) : ""}
  </div>
}
