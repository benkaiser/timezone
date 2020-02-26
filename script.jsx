const DATE_FMT = 'ddd Do MMM YYYY';
const HOUR_LIST = [];
for(var i = 0; i < 24; i++){
  var label = i < 12 ? `${i}am` : `${i-12}pm`;
  if (i === 0) {
    label = '12am (midnight)';
  } else if (i === 12) {
    label = '12pm (noon)';
  }
  HOUR_LIST.push({
    time: 0,
    label
  });
}
console.log('Handle');

class App extends React.Component {
  constructor() {
    super();
    this._inputRef = [];
    this._inputRef['timezoneOne'] = React.createRef();
    this._inputRef['timezoneTwo'] = React.createRef();
    const urlParams = new URLSearchParams(window.location.search);
    const firstTimezoneInUrl = urlParams.get('t1');
    const secondTimezoneInUrl = urlParams.get('t2');
    if (firstTimezoneInUrl && secondTimezoneInUrl) {
      try {
        this.state = {
          firstTimezone: firstTimezoneInUrl,
          secondTimezone: secondTimezoneInUrl,
          currentOffset: this._offsetForTime(firstTimezoneInUrl, secondTimezoneInUrl, moment.utc()),
          offsets: this._generateOffsets(firstTimezoneInUrl, secondTimezoneInUrl)
        };
      } catch (_) {
        this.state = {};
      }
    } else {
      this.state = {};
    }
  }

  render() {
    return (
      <div>
        { this._timezoneInputFor('timezoneOne', 'First Location', this.state.firstTimezone) }
        { this._timezoneInputFor('timezoneTwo', 'Second Location', this.state.secondTimezone) }
        <button className='offset-sm-4 col-sm-8 btn btn-primary' onClick={this._calculateOffsets}>Get Timeline</button>
        { this.state.firstTimezone ? this._renderOffsets() : null }
      </div>
    );
  }

  _renderOffsets() {
    return (
      <div>
        <h4 className='currentDiff'>
          <span className='currentTimeTooltip' title={this._timeFor(this.state.firstTimezone)}>{this.state.firstTimezone}</span>
          { ' ' }is currently {this._diffTextFor(this.state.currentOffset)}
          { ' ' }<span className='currentTimeTooltip' title={this._timeFor(this.state.secondTimezone)}>{this.state.secondTimezone}</span>
        </h4>
        { this.state.offsets.length > 0 ? this._renderTimeline() : <h4 className='noDiff'>These timezones do not differ in the next 5 years</h4> }
      </div>
    )
  }

  _renderTimeline() {
    return (
      <div>
        { this.state.offsets.map((offset, index) =>
          <div>
            {/* <p>{offset.startLabel}</p>
            <p>{this.state.firstTimezone} will be {this._diffTextFor(offset.offset)} {this.state.secondTimezone}</p> */}
            <div class="card">
              <div class="card-body">
                <h4 class="card-title">{offset.startLabel} until {offset.endLabel}</h4>
                <p class="card-text">{this.state.firstTimezone} will be {this._diffTextFor(offset.offset)} {this.state.secondTimezone}</p>
                <button className='btn btn-info' onClick={this._toggleOverlap.bind(this, index)}>{ this.state.expandOffset === index ? 'Hide Overlap' : 'Show Overlap' }</button>
                { this.state.expandOffset === index ? this._renderOverlap(offset) : undefined }
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  _renderOverlap(offset) {
    return (
      <table>
        <tr>
          <th>{this.state.firstTimezone}</th>
          <th>{this.state.secondTimezone}</th>
        </tr>
        { HOUR_LIST.map((hour, index) => {
          let secondTimezoneHourIndex = (index - offset.offset) % HOUR_LIST.length;
          if (secondTimezoneHourIndex < 0) {
            secondTimezoneHourIndex = HOUR_LIST.length + secondTimezoneHourIndex
          }
          return (
            <tr>
              <td className={this._classForCell(index)}>{hour.label}</td>
              <td className={this._classForCell(secondTimezoneHourIndex)}>{HOUR_LIST[secondTimezoneHourIndex].label}</td>
            </tr>
          );
        }) }
      </table>
    )
  }

  _classForCell(hourIndex) {
    if (hourIndex < 7 || hourIndex > 22) {
      return 'night';
    } else if (hourIndex < 9 || hourIndex > 16) {
      return 'awake';
    } else {
      return 'working';
    }
  }

  _toggleOverlap(index) {
    if (index === this.state.expandOffset) {
      this.setState({
        expandOffset: undefined
      });
    } else {
      this.setState({
        expandOffset: index
      });
    }
  }

  _diffTextFor(diffInHours) {
    if (diffInHours === 0) {
      return 'the same timezone as';
    } else if (diffInHours == 1) {
      return `${diffInHours} hour ahead of`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hours ahead of`;
    } else if (diffInHours == -1) {
      return `${Math.abs(diffInHours)} hour behind`;
    } else if (diffInHours < 0) {
      return `${Math.abs(diffInHours)} hours behind`;
    }
  }

  _timezoneInputFor(id, label, defaultValue) {
    return (
      <div className="form-group row">
          <label for={id} className="col-sm-4 col-form-label">{label}</label>
          <div className="col-sm-8">
            <select defaultValue={defaultValue} class="form-control" id="timezoneOne" ref={this._inputRef[id]}>
              { moment.tz.names().map(name =>
                <option value={name}>{name}</option>
              ) }
            </select>
          </div>
        </div>
    );
  }

  _calculateOffsets = () => {
    const firstTimezone = this._inputRef['timezoneOne'].current.value;
    const secondTimezone = this._inputRef['timezoneTwo'].current.value;
    history.pushState({}, '', window.location.pathname + `?t1=${encodeURIComponent(firstTimezone)}&t2=${encodeURIComponent(secondTimezone)}`);
    this.setState({
      firstTimezone,
      secondTimezone,
      currentOffset: this._offsetForTime(firstTimezone, secondTimezone, moment.utc()),
      offsets: this._generateOffsets(firstTimezone, secondTimezone)
    });
  }

  _generateOffsets(timezoneOne, timezoneTwo) {
    const calcOffset = this._offsetForTime.bind(this, timezoneOne, timezoneTwo);
    const offsets = [];
    var now = moment.utc();
    var startMark = {
      label: 'Now',
      time: now,
      offset: calcOffset(now)
    };
    for (var x = 0; x < 1830 /* just more than 5 years */; x++) {
      now = now.add(1, 'days');
      var newOffset = calcOffset(now);
      if (newOffset !== startMark.offset) {
        var yesterday = now.clone().subtract(1, 'days');
        offsets.push({
          startLabel: startMark.label,
          startTime: startMark.time,
          endLabel: yesterday.format(DATE_FMT),
          endTime: yesterday,
          offset: startMark.offset
        });
        startMark = {
          label: now.format(DATE_FMT),
          time: now,
          offset: newOffset
        };
      }
    }
    console.log(offsets);
    return offsets;
  }

  _offsetForTime(timezoneOne, timezoneTwo, time) {
    var t1 = moment.tz.zone(timezoneOne).utcOffset(time);
    var t2 = moment.tz.zone(timezoneTwo).utcOffset(time);
    return (t2 - t1) / 60;
  }

  _timeFor(timezone) {
    return moment().tz(timezone).format('ddd Do LT');

  }
}

ReactDOM.render(
  <App />,
  document.getElementById('container')
);