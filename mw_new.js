Mw = function () {
    const { formData: t, setFormData: n, handleChange: r } = Vu(),
        o = Cd()().startOf("day"),
        a = t.dateString ? Cd()(t.dateString, "YYYY-MM-DD") : null,
        i = a ? a.diff(o, "day") : null,
        l = "GENERAL" === t.quotaType && i >= 60;
    
    const [fromList, setFromList] = (0, e.useState)([]);
    const [toList, setToList] = (0, e.useState)([]);
    const [trainList, setTrainList] = (0, e.useState)([]);
    
    const [fromDisplay, setFromDisplay] = (0, e.useState)(t.fromDisplay || t.from || "");
    const [toDisplay, setToDisplay] = (0, e.useState)(t.toDisplay || t.to || "");
    const [trainDisplay, setTrainDisplay] = (0, e.useState)(t.trainDisplay || t.trainNumber || "");
    const prevDeps = (0, e.useRef)({ from: t.from, to: t.to, dateString: t.dateString });

    (0, e.useEffect)(() => { setFromDisplay(t.fromDisplay || t.from || ""); }, [t.fromDisplay, t.from]);
    (0, e.useEffect)(() => { setToDisplay(t.toDisplay || t.to || ""); }, [t.toDisplay, t.to]);
    (0, e.useEffect)(() => { setTrainDisplay(t.trainDisplay || t.trainNumber || ""); }, [t.trainDisplay, t.trainNumber]);

    (0, e.useEffect)(() => {
        const listener = (changes, area) => {
            if (area === "local" && changes["tatkalTicketBookingFormData"] && changes["tatkalTicketBookingFormData"].newValue) {
                n(changes["tatkalTicketBookingFormData"].newValue);
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, [n]);

    (0, e.useEffect)(() => {
        "GENERAL" === t.quotaType &&
            !l &&
            t.isOpeningDayBooking &&
            n((e) => ({ ...e, isOpeningDayBooking: !1 }));
    }, [l, t.isOpeningDayBooking, t.quotaType, n]);

    const fetchStations = async (query, isFrom) => {
        if (query.length < 2) return;
        try {
            const res = await fetch(`https://travel.paytm.com/api/trains/v3/station/${query}?isH5=true&client=web&deviceIdentifier=test`);
            const data = await res.json();
            const stations = [];
            if (data.body && data.body.length > 0) {
                data.body.forEach(item => {
                    if (item.stations) {
                        item.stations.forEach(st => {
                            if (st.data) {
                                stations.push({
                                    code: st.data.code,
                                    name: st.data.name
                                });
                            }
                        });
                    }
                });
            }
            isFrom ? setFromList(stations) : setToList(stations);
        } catch (e) {}
    };

    (0, e.useEffect)(() => {
        if (t.from && t.to && t.dateString) {
            const dateStr = Cd()(t.dateString).format("YYYYMMDD");
            new Promise(resolve => {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.get(["irctc_train_cache"], (result) => {
                        const cache = result.irctc_train_cache;
                        if (cache && cache.fromCode === t.from && cache.toCode === t.to && cache.dateStr === dateStr) {
                            resolve(cache.trains);
                        } else {
                            fetch(`https://travel.paytm.com/api/trains/v5/search?departureDate=${dateStr}&destination=${t.to}&isAscOfferEligible=false&isH5=true&is_new_user=null&quota=GN&show_empty=true&source=${t.from}&client=web&deviceIdentifier=test`)
                                .then(res => res.json())
                                .then(data => {
                                    if (data.body && data.body.trains) {
                                        const trains = data.body.trains.map(tr => {
                                            const coaches = [];
                                            if (tr.availability) {
                                                tr.availability.forEach(avail => {
                                                    coaches.push({ code: avail.code });
                                                });
                                            }
                                            return {
                                                trainName: tr.trainName,
                                                trainNumber: tr.trainNumber,
                                                departure: tr.departure,
                                                arrival: tr.arrival,
                                                duration: tr.duration,
                                                source: tr.source,
                                                destination: tr.destination,
                                                availability: tr.availability,
                                                coaches: coaches
                                            };
                                        });
                                        chrome.storage.local.set({
                                            irctc_train_cache: {
                                                fromCode: t.from, toCode: t.to, dateStr, trains
                                            }
                                        });
                                        resolve(trains);
                                    } else {
                                        resolve([]);
                                    }
                                }).catch(() => resolve([]));
                        }
                    });
                } else {
                    resolve([]);
                }
            }).then(apiTrains => {
                const trains = [];
                if (apiTrains && apiTrains.length) {
                    apiTrains.forEach(train => {
                        const tName = train.trainName || "Unknown Train";
                        const tNum = train.trainNumber || "00000";
                        const coaches = [];
                        if (train.availability) {
                            train.availability.forEach(avail => {
                                coaches.push({ code: avail.code });
                            });
                        }
                        if (!trains.some(tr => tr.number === tNum)) {
                            trains.push({ 
                                name: tName, number: tNum, coaches,
                                departure: train.departure, arrival: train.arrival, duration: train.duration,
                                source: train.source, destination: train.destination, availability: train.availability
                            });
                        }
                        // Auto-expand train number
                        if (tNum === t.trainNumber) {
                            setTrainDisplay(`${tName} (${tNum})`);
                        }
                    });
                }
                setTrainList(trains);
                
                const depsChanged = prevDeps.current.from !== t.from || prevDeps.current.to !== t.to || prevDeps.current.dateString !== t.dateString;
                if (depsChanged) {
                    prevDeps.current = { from: t.from, to: t.to, dateString: t.dateString };
                    if (t.trainNumber) {
                        const found = trains.find(tr => tr.number === t.trainNumber);
                        if (!found) {
                            setTrainDisplay("");
                            n(prev => ({ ...prev, trainNumber: "", trainDisplay: "", accommodationClass: "" }));
                        }
                    }
                }
            });
        }
    }, [t.from, t.to, t.dateString, t.trainNumber]);

    (0, e.useEffect)(() => {
        if (t.from && t.from === fromDisplay) {
            fetch(`https://travel.paytm.com/api/trains/v3/station/${t.from}?isH5=true&client=web&deviceIdentifier=test`)
                .then(res => res.json())
                .then(data => {
                    if (data.body && data.body.length > 0 && data.body[0].stations) {
                        const st = data.body[0].stations.find(s => s.data && s.data.code === t.from);
                        if (st) setFromDisplay(`${st.data.name} (${st.data.code})`);
                    }
                }).catch(() => {});
        }
    }, [t.from]);

    (0, e.useEffect)(() => {
        if (t.to && t.to === toDisplay) {
            fetch(`https://travel.paytm.com/api/trains/v3/station/${t.to}?isH5=true&client=web&deviceIdentifier=test`)
                .then(res => res.json())
                .then(data => {
                    if (data.body && data.body.length > 0 && data.body[0].stations) {
                        const st = data.body[0].stations.find(s => s.data && s.data.code === t.to);
                        if (st) setToDisplay(`${st.data.name} (${st.data.code})`);
                    }
                }).catch(() => {});
        }
    }, [t.to]);

    const handleFromChange = (evt) => {
        const val = evt.target.value;
        setFromDisplay(val);
        const match = val.match(/\(([A-Z0-9]+)\)/);
        if (match) {
            n({ ...t, from: match[1], fromDisplay: val });
        } else {
            n({ ...t, from: Cw(val), fromDisplay: val });
            if (val.length < 2) {
                setFromList([]);
            } else {
                fetchStations(val, true);
            }
        }
    };

    const handleToChange = (evt) => {
        const val = evt.target.value;
        setToDisplay(val);
        const match = val.match(/\(([A-Z0-9]+)\)/);
        if (match) {
            n({ ...t, to: match[1], toDisplay: val });
        } else {
            n({ ...t, to: Cw(val), toDisplay: val });
            if (val.length < 2) {
                setToList([]);
            } else {
                fetchStations(val, false);
            }
        }
    };

    const handleTrainChange = (evt) => {
        const val = evt.target.value;
        setTrainDisplay(val);
        const match = val.match(/\(([0-9]+)\)/);
        if (match) {
            n({ ...t, trainNumber: match[1], trainDisplay: val });
        } else {
            n({ ...t, trainNumber: Sw(val), trainDisplay: val, ...(val.trim() === '' ? { accommodationClass: "" } : {}) });
        }
    };

    const currentTrain = (trainList || []).find(tr => tr.number === t.trainNumber);
    const availableCoaches = currentTrain ? (currentTrain.coaches || []).map(c => c.code) : [];
    const isClassAvailable = (code) => {
        if (!t.trainNumber) return false;
        if (!currentTrain || availableCoaches.length === 0) return true;
        return availableCoaches.includes(code);
    };

    return e.createElement(
        Oa,
        { sx: Ru.container },
        e.createElement(
            Wa,
            { variant: "h5", gutterBottom: !0, align: "center", sx: { fontWeight: "bold", color: "#333", mb: 3 } },
            "Train Details"
        ),
        e.createElement(ER, {
            freeSolo: !0,
            options: fromList || [],
            getOptionLabel: (opt) => typeof opt === "string" ? opt : `${opt.name} (${opt.code})`,
            value: fromDisplay,
            inputValue: fromDisplay,
            onInputChange: (evt, newVal) => { handleFromChange({ target: { value: newVal } }); },
            onChange: (evt, newVal) => { if (newVal) handleFromChange({ target: { value: typeof newVal === "string" ? newVal : `${newVal.name} (${newVal.code})` } }); },
            renderInput: (params) => e.createElement(Fc, {
                ...params,
                fullWidth: !0, label: "From", margin: "normal", required: !0, variant: "outlined",
                placeholder: "Enter origin station name or code",
                InputProps: { ...params.InputProps, sx: Ru.input }
            })
        }),
        e.createElement(ER, {
            freeSolo: !0,
            options: toList || [],
            getOptionLabel: (opt) => typeof opt === "string" ? opt : `${opt.name} (${opt.code})`,
            value: toDisplay,
            inputValue: toDisplay,
            onInputChange: (evt, newVal) => { handleToChange({ target: { value: newVal } }); },
            onChange: (evt, newVal) => { if (newVal) handleToChange({ target: { value: typeof newVal === "string" ? newVal : `${newVal.name} (${newVal.code})` } }); },
            renderInput: (params) => e.createElement(Fc, {
                ...params,
                fullWidth: !0, label: "To", margin: "normal", required: !0, variant: "outlined",
                placeholder: "Enter destination station name or code",
                InputProps: { ...params.InputProps, sx: Ru.input }
            })
        }),
        e.createElement(
            il,
            { fullWidth: !0, margin: "normal" },
            e.createElement(yw, {
                onDateChange: (e, dt) => {
                    n((n) => ({
                        ...n,
                        dateString: e,
                        ...(xw(n.quotaType) && dt ? { scheduleDate: kw(dt) } : {}),
                    }));
                },
            })
        ),
        e.createElement(ER, {
            freeSolo: !0,
            options: trainList || [],
            getOptionLabel: (opt) => typeof opt === "string" ? opt : `${opt.name} (${opt.number})`,
            value: trainDisplay,
            inputValue: trainDisplay,
            onInputChange: (evt, newVal) => { handleTrainChange({ target: { value: newVal } }); },
            onChange: (evt, newVal) => { if (newVal) handleTrainChange({ target: { value: typeof newVal === "string" ? newVal : `${newVal.name} (${newVal.number})` } }); },
            renderInput: (params) => e.createElement(Fc, {
                ...params,
                fullWidth: !0, label: "Train Number", margin: "normal", required: !0, variant: "outlined",
                placeholder: "Enter train name or number",
                InputProps: { ...params.InputProps, sx: Ru.input }
            })
        }),
        currentTrain && e.createElement(Oa, { sx: { mt: 1, mb: 2, p: 2, border: "1px solid #ddd", borderRadius: 2, backgroundColor: "#f9f9f9" } },
            currentTrain.destination !== t.to && e.createElement(Cj, { severity: "error", sx: { mb: 1, borderRadius: 2 } },
                `Warning: Train destination (${currentTrain.destination}) differs from your selected "To" station (${t.to})`
            ),
            e.createElement(Pa, { direction: "row", justifyContent: "space-between", sx: { px: 1 } },
                e.createElement(Oa, { sx: { textAlign: "center" } },
                    e.createElement(Wa, { variant: "caption", sx: { color: "#666", display: "block", textTransform: "uppercase", fontSize: "0.7rem", mb: 0.5 } }, "Departure"),
                    e.createElement(Wa, { variant: "body1", sx: { fontWeight: "bold" } }, (() => {
                        if (!currentTrain.departure) return "";
                        let tm = currentTrain.departure.match(/(\d{1,2}):(\d{2})/);
                        if (!tm) return currentTrain.departure;
                        let h = parseInt(tm[1], 10);
                        let ampm = h >= 12 ? "PM" : "AM";
                        h = h % 12;
                        h = h ? h : 12;
                        return `${h < 10 ? '0'+h : h}:${tm[2]} ${ampm}`;
                    })())
                ),
                e.createElement(Oa, { sx: { textAlign: "center" } },
                    e.createElement(Wa, { variant: "caption", sx: { color: "#666", display: "block", textTransform: "uppercase", fontSize: "0.7rem", mb: 0.5 } }, "Duration"),
                    e.createElement(Wa, { variant: "body1", sx: { fontWeight: "bold" } }, currentTrain.duration + " hrs")
                ),
                e.createElement(Oa, { sx: { textAlign: "center" } },
                    e.createElement(Wa, { variant: "caption", sx: { color: "#666", display: "block", textTransform: "uppercase", fontSize: "0.7rem", mb: 0.5 } }, "Arrival"),
                    e.createElement(Wa, { variant: "body1", sx: { fontWeight: "bold" } }, (() => {
                        if (!currentTrain.arrival) return "";
                        let tm = currentTrain.arrival.match(/(\d{1,2}):(\d{2})/);
                        if (!tm) return currentTrain.arrival;
                        let h = parseInt(tm[1], 10);
                        let ampm = h >= 12 ? "PM" : "AM";
                        h = h % 12;
                        h = h ? h : 12;
                        return `${h < 10 ? '0'+h : h}:${tm[2]} ${ampm}`;
                    })())
                )
            )
        ),
        e.createElement(
            il,
            { fullWidth: !0, margin: "normal" },
            e.createElement(tl, { id: "quotaType-label" }, "Quota Type"),
            e.createElement(
                Ec,
                {
                    labelId: "quotaType-label", id: "quotaType", name: "quotaType", value: t.quotaType,
                    onChange: (e) => {
                        const { value: r } = e.target, o = ww(r, t?.accommodationClass, t?.isOpeningDayBooking, t?.targetTime);
                        n({
                            ...t, quotaType: r, targetTime: o,
                            ...(xw(r) && a ? { scheduleDate: kw(a), isOpeningDayBooking: !1 } : {}),
                        });
                    },
                    label: "Quota Type", variant: "outlined", sx: { backgroundColor: "white" }
                },
                e.createElement(td, { value: "GENERAL" }, "GENERAL"),
                e.createElement(td, { value: "TATKAL" }, "TATKAL"),
                e.createElement(td, { value: "PREMIUM TATKAL" }, "PREMIUM TATKAL"),
            ),
        ),
        l && e.createElement(
            Oa,
            { sx: { mt: 1 } },
            e.createElement(ld, {
                control: e.createElement(wd, {
                    checked: t.isOpeningDayBooking,
                    onChange: (e) => {
                        const t = e.target.checked;
                        n((e) => ({
                            ...e, isOpeningDayBooking: t, targetTime: t ? "07:59:53" : e.targetTime,
                        }));
                    },
                    color: "primary",
                }),
                label: "Opening Day Booking",
            }),
            e.createElement(Wa, { variant: "body2", sx: { color: "text.secondary", mt: 0.5 } }, "Use this when you want General quota automation on the first day booking opens."),
        ),
        "GENERAL" === t.quotaType && !l && e.createElement(Wa, { variant: "body2", sx: { color: "text.secondary", mt: 1 } }, "Opening Day Booking is available for General journeys 60 days away or more."),
        e.createElement(
            il,
            { fullWidth: !0, margin: "normal" },
            e.createElement(tl, { id: "accommodationClass-label" }, "Accommodation Class"),
            e.createElement(
                Ec,
                {
                    labelId: "accommodationClass-label", id: "accommodationClass", name: "accommodationClass", value: t.accommodationClass,
                    onChange: (e) => {
                        const { value: r } = e.target, o = ww(t?.quotaType, r, t?.isOpeningDayBooking, t?.targetTime);
                        n({ ...t, accommodationClass: r, targetTime: o });
                    },
                    label: "Accommodation Class", variant: "outlined", sx: { backgroundColor: "white" }
                },
                !t.trainNumber && e.createElement(td, { value: "", disabled: true }, "Select Class"),
                isClassAvailable("SL") && e.createElement(td, { value: "SL" }, "Sleeper (SL)"),
                isClassAvailable("3A") && e.createElement(td, { value: "3A" }, "AC 3 Tier (3A)"),
                isClassAvailable("2A") && e.createElement(td, { value: "2A" }, "AC 2 Tier (2A)"),
                isClassAvailable("1A") && e.createElement(td, { value: "1A" }, "AC First Class (1A)"),
                isClassAvailable("3E") && e.createElement(td, { value: "3E" }, "AC 3 Economy (3E)"),
                isClassAvailable("EC") && e.createElement(td, { value: "EC" }, "Exec. Chair Car (EC)"),
                isClassAvailable("CC") && e.createElement(td, { value: "CC" }, "AC Chair car (CC)"),
                isClassAvailable("EV") && e.createElement(td, { value: "EV" }, "Vistadome AC (EV)"),
                isClassAvailable("2S") && e.createElement(td, { value: "2S" }, "Second Sitting (2S)"),
                isClassAvailable("FC") && e.createElement(td, { value: "FC" }, "First Class (FC)"),
                isClassAvailable("VC") && e.createElement(td, { value: "VC" }, "Vistadome Chair Car (VC)"),
                isClassAvailable("VS") && e.createElement(td, { value: "VS" }, "Vistadome Non AC (VS)")
            ),
            (() => {
                if (!currentTrain || !currentTrain.availability) return null;
                let availGN = currentTrain.availability.find(a => a.code === t.accommodationClass && a.quota === "GN");
                let availTQ = currentTrain.availability.find(a => a.code === t.accommodationClass && a.quota === "TQ");
                
                let avail = availGN || availTQ || currentTrain.availability.find(a => a.code === t.accommodationClass);
                if (!avail) return null;
                
                if (t.quotaType === "TATKAL" && availTQ && availTQ.fare) {
                    return e.createElement(Wa, { variant: "body2", sx: { color: "success.main", mt: 1, fontWeight: "bold" } }, `Estimated Price: ₹${availTQ.fare}`);
                }
                
                let baseFare = availGN ? availGN.fare : avail.fare;
                if (!baseFare) return e.createElement(Wa, { variant: "body2", sx: { color: "text.secondary", mt: 1, fontStyle: "italic" } }, "Price information not available");
                
                if (t.quotaType === "GENERAL") return e.createElement(Wa, { variant: "body2", sx: { color: "success.main", mt: 1, fontWeight: "bold" } }, `Estimated Price: ₹${baseFare}`);
                if (t.quotaType === "PREMIUM TATKAL") return e.createElement(Wa, { variant: "body2", sx: { color: "success.main", mt: 1, fontWeight: "bold" } }, `Estimated Price: ₹${baseFare} + Dynamic Charges (Prices for Premium Tatkal are dynamic and depend on demand)`);
                
                if (t.quotaType === "TATKAL") {
                    let percentage = 0.30;
                    let min = 0, max = 0;
                    const cls = t.accommodationClass;
                    if (cls === "2S") { percentage = 0.10; min = 10; max = 15; }
                    else if (cls === "SL") { percentage = 0.10; min = 100; max = 200; }
                    else if (cls === "CC") { min = 125; max = 225; }
                    else if (cls === "3A" || cls === "3E") { min = 300; max = 400; }
                    else if (cls === "2A") { min = 400; max = 500; }
                    else if (cls === "1A" || cls === "EC") { min = 400; max = 500; }
                    
                    let tatkalCharge = baseFare * percentage;
                    if (tatkalCharge < min) tatkalCharge = min;
                    if (tatkalCharge > max) tatkalCharge = max;
                    
                    return e.createElement(Wa, { variant: "body2", sx: { color: "success.main", mt: 1, fontWeight: "bold" } }, `Estimated Price: ₹${Math.round(baseFare + tatkalCharge)}`);
                }
                return null;
            })()
        )
    );
}
