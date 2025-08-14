import * as React from 'preact'
import { useState, useRef } from 'preact/hooks';

interface Props {
  id?: string,
  name?: string,
  inputValue?: string,
  placeholder?: string,
  debounce?: number,
  callback?: Function,
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
  boundingbox: Array<string>,
  display_name: string,
  lat: string,
  lon: string
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

const renderResults = (results: any, callback: Function | undefined, dispatch: (value: boolean) => void, resultsClassNames: string = "results", resultClassNames: string = "result") =>
  <div className={resultsClassNames}>
    {results.map((result: Result, index: number) =>
      <div key={index} className={resultClassNames} onClick={() => {
        if (callback) {
          callback(result);
          dispatch(false);
        }
      }}>
        {result?.display_name}
      </div>
    )}
  </div>


export const ReactOsmGeocoding = ({ id = "", name = "", inputValue = "", placeholder = "Enter address", debounce = 1000, callback, city = "", countrycodes = "ca", acceptLanguage = "en", viewbox = "", outerClassNames = "reactOsmGeocoding", inputClassNames = "", loaderClassNames = "loader", resultsClassNames = "results", resultClassNames = "result" }: Props) => {
  const [results, setResults] = useState<Partial<Result[]>>([]);
  const [showResults, setShowResults] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

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

  function getGeocoding(address = "") {
    if (address.length === 0) return;

    setShowLoader(true);

    let url = `https://nominatim.openstreetmap.org/search?format=json&accept-language=${acceptLanguage}`;

    if (city) {
      url = `${url}&street=${address}&city=${city}`;
    } else {
      url = `${url}&q=${address}`
    }

    if (countrycodes) {
      url = `${url}&countrycodes=${countrycodes}`;
    }

    if (viewbox.length)
      url = `${url}&viewbox=${viewbox}&bounded=1`;

    fetch(url)
      .then(response => response.json())
      .then((data) => {
        setResults(data);
        setShowResults(true);
      })
      .catch(err => console.warn(err))
      .finally(() => setShowLoader(false));
  }

  var debouncer = new debouncedMethod((address: string) => {
    getGeocoding(address);
  }, debounce);



  return <div className={outerClassNames} ref={mainContainerRef}>
    <input
      id={id}
      name={name}
      type="text"
      value={inputValue}
      placeholder={placeholder}
      className={inputClassNames}
      onClick={() => setShowResults(true)}
      onKeyUp={event => {
        const target = event.target as HTMLTextAreaElement;
        debouncer.invoke(target.value);
      }
      } />
    {showLoader && <div className={loaderClassNames}></div>}
    {(results.length && showResults) ? renderResults(results, callback, (toggle) => {
      setShowResults(toggle);
      if (!toggle) {
        setResults([]);
      }
    }, resultsClassNames, resultClassNames) : ""}
  </div>
}
