
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        contract.isOperational((error, result) => {
            if (error) {
                console.log(error);
            }
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        DOM.elid('register-airline').addEventListener('click', () => {
            let airlineAddress = DOM.elid('airline-address').value;
            contract.registerAirline(airlineAddress, (error, result) => {
                display('Airline', 'Register Airline', [ { label: 'Register Airline', error: error, value: 'success'} ]);
            });
        });

        DOM.elid('register-check').addEventListener('click', () => {
            let airlineAddress = DOM.elid('check-address').value;
            contract.checkRegistration(airlineAddress, (error, result) => {
                display('Airline Registration', 'Check if airline is registered', [ { label: 'Registration Status', error: error, value: result} ]);
            });
        });

        DOM.elid('submit-fund').addEventListener('click', () => {
            contract.submitFund((error, result) => {
                display('Airline', 'Submit Fund', [ { label: 'Submit Fund', error: error, value: 'success'} ]);
            });
        });

        DOM.elid('register-flight').addEventListener('click', () => {
            let index = DOM.elid('flight-select').selectedIndex;
            let flight = DOM.elid('flight-select').options[index].text;
            contract.registerFlight(flight, (error, result) => {
                display('Airline', 'Register Flight', [ { label: 'Register Flight', error: error, value: 'success'} ]);
            });
        });

        DOM.elid('book-flight').addEventListener('click', () => {
            let index = DOM.elid('flight-select').selectedIndex;
            let flight = DOM.elid('flight-select').options[index].text;

            let indexInsurance = DOM.elid('insurance-select').selectedIndex;
            let insuranceAmount = DOM.elid('insurance-select').options[indexInsurance].text;

            contract.bookFlight(flight, insuranceAmount, (error, result) => {
                display('Airline', 'Book Flight', [ { label: 'Book Flight', error: error, value: 'success'} ]);
            });
        });

        DOM.elid('submit-oracle').addEventListener('click', () => {
            let index = DOM.elid('flight-select').selectedIndex;
            let flight = DOM.elid('flight-select').options[index].text;
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        });

        DOM.elid('claim').addEventListener('click', () => {
            let originAddress = '0xe0883EF7bf7C54E06eF66e141f72a73DBbC0035a'; // passenger address
            contract.withdraw(originAddress, (error, result) => {
                display('Oracles', 'Withdraw request', [ { label: 'Withdraw request', error: error, value: 'success'} ]);
            });
        });

        DOM.elid('check-credit').addEventListener('click', () => {
            let originAddress = '0xe0883EF7bf7C54E06eF66e141f72a73DBbC0035a'; // passenger address
            contract.getCredit(originAddress, (error, result) => {
                DOM.elid('credit-value').innerHTML = result;
            });
        });

        DOM.elid('check-balance').addEventListener('click', () => {
            let originAddress = '0xe0883EF7bf7C54E06eF66e141f72a73DBbC0035a'; // passenger address
            contract.getBalance(originAddress, (error, result) => {
                DOM.elid('balance-value').innerHTML = result;
            });
        });
    });
})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}







