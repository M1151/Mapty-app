'use strict';

// prettier-ignore

console.log(new Date());

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(distance, duration, coords) {
    this.duration = duration; // in min
    this.distance = distance; // in km
    this.coords = coords; // [lat , lng]
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${
      this.type[0].toUpperCase() + this.type.slice(1)
    } on ${this.date.getDate()} ${months[this.date.getMonth()]}`;
  }
  _setSympol() {
    this.sympol = this.type === 'running' ? '🏃‍♂️' : '🚴';
  }
  _click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence; // step/min
    this.calcPace();
    this._setDescription();
    this._setSympol();
  }

  calcPace() {
    this.pace = this.duration / this.distance; // min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevation) {
    super(distance, duration, coords);
    this.elevation = elevation; // km
    this.calcSpeed();
    this._setDescription();
    this._setSympol();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // km/h
    return this.speed;
  }
}

// const run1 = new Running(2.6 , 125 , [37 , -36] , 46)
// const cycl1 = new Cycling(16 , 51 , [39 , -19] , 15)
// console.log(run1 );
// console.log(cycl1 );

// console.log(!Number/.isFinite(undefined));

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// app structure

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #markers = new Map();
  #mapZoomIndex = 13;
  #edittingMode = false;
  #edittingWorkout;
  constructor() {
    this._getPosition();
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (this.#edittingMode) {
        this._approveEditedWorkouts(e);
        return;
      } else {
        this._newWorkout(e);
      }
    });
    inputType.addEventListener('change', this._toggleElevationForm.bind(this));
    containerWorkouts.addEventListener('click', e => {
      if (e.target.classList.contains('edit')) {
        this._editWorkout(e);
        return;
      } else if (e.target.classList.contains('delete')) {
        this._deleteWorkout(e);
        return;
      }
      this._goToPopup(e);
    });
    this._getLocalStorage();
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
      alert('canot access your location');
    });
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomIndex);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._activateMap.bind(this));
    this.#workouts.forEach(w => {
      this._renderMarkerToMap(w);
    });
  }

  _validInputs(...inputs) {
    return inputs.every(inp => Number.isFinite(inp));
  }

  _povInputs(...inputs) {
    return inputs.every(inp => inp > 0);
  }

  _newWorkout(e) {
    e.preventDefault();

    // Get the data from the form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    const { lat, lng } = this.#mapEvent.latlng;

    // if workout is running , create a running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if the data is valid
      if (
        this._validInputs(distance, duration, cadence) &&
        this._povInputs(distance, duration, cadence)
      ) {
        workout = new Running(distance, duration, [lat, lng], cadence);
        console.log(workout);
      } else {
        alert('Please insert a positive inputs');
      }
    }
    // if workout is cycling , create a cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if the data is valid
      if (
        this._validInputs(distance, duration, elevation) &&
        this._povInputs(distance, duration)
      ) {
        workout = new Cycling(distance, duration, [lat, lng], elevation);
        console.log(workout);
      } else {
        alert('Please insert a positive inputs');
      }
    }
    // if (!workout) return;
    // insert the new object to the workouts array
    this.#workouts.push(workout);

    // add the workout on the map as a marker
    this._renderMarkerToMap(workout);
    // render workout in the workouts list
    this._renderWorkoutToList(workout);
    // hide form + clean the  input fields
    this._hideForm();
    // set LocalStorage
    this._setLocalStorage();
  }

  _renderWorkoutToList(workout) {
    let workoutHTML = ` <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description} <i class="fa-solid fa-pencil edit"></i> <i class="fa-solid fa-trash delete"></i></h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.sympol}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    workoutHTML +=
      workout.type === 'running'
        ? `          
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
        </div>
      </li> `
        : `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> `;

    form.insertAdjacentHTML('afterend', workoutHTML);
  }

  _renderMarkerToMap(workout) {
    const popup = L.popup({
      minWidth: 100,
      maxWidth: 250,
      autoClose: false,
      closeOnClick: false,
      // closeButton: false,
      className: `${workout.type}-popup`,
    });
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(popup)
      .openPopup()
      .setPopupContent(`${workout.sympol} ${workout.description}`);
    this.#markers.set(workout.id, marker);
    // console.log(this.#markers);
  }

  _toggleElevationForm() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _activateMap(mapE) {
    this.#mapEvent = mapE;
    this._showForm();
  }

  _showForm() {
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _fillInputsFields(workout) {
    inputCadence.value = '';
    inputElevation.value = '';

    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;

    if (workout.type === 'running') inputCadence.value = workout.cadence;
    if (workout.type === 'cycling') inputElevation.value = workout.elevation;
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _getClickedWorkout(e) {
    const workoutID = e.target.closest('.workout')?.dataset.id;
    const workout = this.#workouts.find(w => w.id === workoutID);
    return workout;
  }

  _goToPopup(e) {
    const workout = this._getClickedWorkout(e);
    if (!workout) return;

    this.#map.flyTo(workout.coords, this.#mapZoomIndex, {
      animate: true,
      duration: 1,
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data.map(w => {
      if (w.type === 'running') {
        let workout = new Running(w.distance, w.duration, w.coords, w.cadence);
        workout.id = w.id;
        workout.clicks = w.clicks;
        workout.date = new Date(w.date);
        return workout;
      }
      if (w.type === 'cycling') {
        let workout = new Cycling(
          w.distance,
          w.duration,
          w.coords,
          w.elevation
        );
        workout.id = w.id;
        workout.clicks = w.clicks;
        workout.date = new Date(w.date);
        return workout;
      }
    });
    this.#workouts.forEach(w => {
      this._renderWorkoutToList(w);
    });
  }

  _editWorkout(e) {
    this.#edittingMode = true;
    const workout = this._getClickedWorkout(e);
    this.#edittingWorkout = workout;
    this._showForm();

    this._fillInputsFields(workout);
  }

  _approveEditedWorkouts(e) {
    e.preventDefault();
    let workout = this.#edittingWorkout;
    console.log(e);
    console.log('dfref');
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // if workout is running , create a running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if the data is valid
      if (
        this._validInputs(distance, duration, cadence) &&
        this._povInputs(distance, duration, cadence)
      ) {
        workout.distance = distance;
        workout.duration = duration;
        workout.cadence = cadence;
        console.log(this.#workouts);
      } else {
        alert('Please insert a positive inputs');
      }
    }
    // if workout is cycling , create a cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if the data is valid
      if (
        this._validInputs(distance, duration, elevation) &&
        this._povInputs(distance, duration)
      ) {
        workout.distance = distance;
        workout.duration = duration;
        workout.elevation = elevation;
        console.log(this.#workouts);
      } else {
        alert('Please insert a positive inputs');
      }
    }
    const workoutEl = document.querySelector(`[data-id="${workout.id}"]`);
    if (workoutEl) workoutEl.remove();
    this._renderWorkoutToList(workout);
    // // render workout in the workouts list
    // this._renderWorkoutToList(workout);
    // // hide form + clean the  input fields
    this._hideForm();
    // set LocalStorage
    this._setLocalStorage();
  }

  _deleteWorkout(e) {
    const workout = this._getClickedWorkout(e);
    // workout.marker = false
    const marker = this.#markers.get(workout.id);
    if (marker) this.#map.removeLayer(marker);
    this.#workouts = this.#workouts.filter(w => w.id !== workout.id);
    e.target.closest('.workout').remove();
    this._setLocalStorage();
  }
}

const app = new App();
// console.log(app);

// console.log(inputElevation.closest('.form__row'));
