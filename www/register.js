$(function() {
    let contestId = Cookies.get('registerId');
    
    let contestEvents = {
        "NW1": [],
        "NW2": []
    };

    $.ajax({
        type: 'GET',
        url: '/api/contests/'+contestId,
        dataType: 'json',
        success: function(data) {
            data.EventList.forEach((event) => {
                if (event.classNbr == '1') {
                    contestEvents["NW1"].push({
                        "id": event.id,
                        "name": event.name,
                        "sortOrder": event.sortOrder
                    });
                } else if (event.classNbr == '2') {
                    contestEvents["NW2"].push({
                        "id": event.id,
                        "name": event.name,
                        "sortOrder": event.sortOrder
                    })
                }
            });

            contestEvents["NW1"].sort((a, b) => (a.sortOrder > b.sortOrder) ? 1 : -1);
            contestEvents["NW2"].sort((a, b) => (a.sortOrder > b.sortOrder) ? 1 : -1);

            $('#contestName').html(" | " + data.name);
        },
        error: function(error) {
            // console.error(error);
            window.location.href = "/";
        },
    });

    $('#editStep1').hide();
    $('#accordionStep2').hide();
    $('#step3').hide();

    function getContestDataIfAvailable() {
        let participant = $('#step1').serializeArray();
        var participantObj = {};
        $(participant).each(function(index, obj){
            let pname = $.trim(obj.name);
            let pvalue = $.trim(obj.value);
            participantObj[pname] = pvalue;
        });

        $.ajax({
            type: 'POST',
            url: '/api/participants',
            data: JSON.stringify(participantObj),
            contentType: "application/json",
        }).then(function(data) {
            let participant = JSON.parse(data);
            return $.ajax({
                type: 'GET',
                url: '/api/results/'+contestId+'/participants/'+participant.id,
                dataType: 'json'
            })
        }).done(function(data) {
            // console.log('done ', data);
            generateStep2(participantObj, data);
        }).fail(function(err) {
            console.log('err', err);
        });
    }

    $('#buttonStep1').click(function() {
        let form = document.querySelector('#step1');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
        } else {
            getContestDataIfAvailable();
            $("#step1 :input").attr("disabled", true);
            $('#buttonStep1').hide();
            $('#editStep1').show();
            $('#editStep1').attr("disabled", false);
            $('#accordionStep2').show();
            $('#step3').show();
        }
    });

    $('#editStep1').click(function() {
        $("#step1 :input").attr("disabled", false);
        $('#buttonStep1').show();
        $('#editStep1').hide();
    });

    function createCard(searchData) {
        var template = window.createSearchCard(searchData);
        return $(template.join(''));
    }

    function generateStep2(participant, data) {
        let events = participant.classNbr == '1' ? contestEvents.NW1 : contestEvents.NW2;
        let nbrOfSearches = events.length;
        var search = [];
        for (let i = 1; i <= nbrOfSearches; i++) {
            let resultId = data && data[i-1] ? data[i-1].resultId : null;
            let points = data && data[i-1] ? data[i-1].points : 0;
            let errors = data && data[i-1] ? data[i-1].errors : 0;

            let ticks = data && data[i-1] ? data[i-1].time : 0;
            let mm = Math.floor(ticks / (60*100));
            let ss = Math.floor((ticks / 100) % 60);
            let ms = ticks % 100;

            let sse = data && data[i-1] ? data[i-1].sse : false;
            let eventId = events && events[i-1] ? events[i-1].id : null;
            let eventName = events && events[i-1] ? events[i-1].name : '';
            search.push({
                "resultId": resultId,
                "eventId": eventId,
                "name": eventName,
                "order": i,
                "points": points,
                "errors": errors,
                "mm": mm,
                "ss": ss,
                "ms": ms,
                "sse": sse
            });
        }
        var cards = $();
        search.forEach(function(item, i) {
            cards = cards.add(createCard(item));
        });
        $('#search_steps').html(cards);
        $('#collapse1').addClass("show");

        setUpValidation();
        let form = document.querySelector('#step2');
        setSummary(form, nbrOfSearches);
    }
    
    function setUpValidation() {
        $('#step2').validate({
            onsubmit: false,
            errorPlacement: function ($error, $element) {
                var name = $element.attr("name");
                $(".invalid-" + name).html($error);
            }
        });

        $('#step2 input[id^="point"]').each(function(){
            $(this).rules( "add", {
                number: true,
                min: 0,
                max: 25,
                messages: {
                    max: "Totalt antal poäng kan inte överstiga 25"
                }
            });
        });

        $('#step2 input[id^="error"]').each(function(){
            $(this).rules( "add", {
                number: true
            });
        });

        $('#step2 input[id^="time_mm"]').each(function(){
            $(this).rules( "add", {
                number: true,
                min: 0,
                max: 15,
                messages: {
                    max: 'Använd format minuter : sekunder , hundradelar'
                }
            });
        });

        $('#step2 input[id^="time_ss"]').each(function(){
            $(this).rules( "add", {
                number: true,
                min: 0,
                max: 59,
                messages: {
                    max: 'Använd format minuter : sekunder , hundradelar'
                }
            });
        });

        $('#step2 input[id^="time_ms"]').each(function(){
            $(this).rules( "add", {
                number: true,
                min: 0,
                max: 99,
                messages: {
                    max: 'Använd format minuter : sekunder , hundradelar'
                }
            });
        });
    }

    function allCollapsables(form, add) {
        let collapsables = form.querySelectorAll(".collapse");
        collapsables.forEach(c => {
            if (add) {
                c.classList.add('show');
            } else {
                c.classList.remove('show');
            }
        });
    }

    function setSummary(form, nbrOfSearches) {
        for (let i = 1; i <= nbrOfSearches; i++) {
            let si = parseInt(i);
            let points = form.querySelector('#point_'+si).value;
            let errors = form.querySelector('#error_'+si).value;
            let mm = form.querySelector('#time_mm_'+si).value;
            let ss = form.querySelector('#time_ss_'+si).value;
            let ms = form.querySelector('#time_ms_'+si).value;
            let sse = form.querySelector('#sse_'+si).checked;
            writeSummary(i, points, errors, mm, ss, ms, sse);
        }
    }

    function writeSummary(nbrStr, points, errors, mm, ss, ms, sse) {
        let si = parseInt(nbrStr);
        $('#search_points_'+si).text(Number(points)+"p ");
        $('#search_errors_'+si).text(Number(errors)+"p ");
        let fmm = String(mm).padStart(2, '0');
        let fss = String(ss).padStart(2, '0');
        let fms = String(ms).padStart(2, '0');
        $('#search_time_'+si).text(fmm+":"+fss+","+fms+" ");
        if (sse) {
            $('#search_sse_'+si).text("sse");
        } else {
            $('#search_sse_'+si).text("");
        }
    }

    $('#search_steps').click(function() {
        let form = document.querySelector('#step2');
        if (!$('#step2').valid()) {
            $('#save').attr("disabled", true);
        } else {
            let classNbr = $('input[name="classNbr"]:checked').val();
            let events = classNbr == '1' ? contestEvents.NW1 : contestEvents.NW2;
            let nbrOfSearches = events.length;

            setSummary(form, nbrOfSearches);
            $('#save').attr("disabled", false);
        }
    });

    $('#save').click(function(){ 
        // Cookies.remove('registerId');

        $("#step1 :input").attr("disabled", false);
        let participant = $('#step1').serializeArray();
        $("#step1 :input").attr("disabled", true);

        $("#step2 :input").attr("disabled", false);
        let results = $('#step2').serializeArray();
        $("#step2 :input").attr("disabled", true);

        let classNbr = $('input[name="classNbr"]:checked').val();
        let events = classNbr == '1' ? contestEvents.NW1 : contestEvents.NW2;
        let nbrOfSearches = events.length;

        var resultData = {};
        $(results).each(function(index, obj) {
            let objName = $.trim(obj.name);
            let objValue = $.trim(obj.value);
            resultData[objName] = objValue;
        });

        let search = [];
        for (let i = 1; i <= nbrOfSearches; i++) {
            let si = parseInt(i);
            let eventId = resultData['event_id_'+si];
            // let eventName = $('#search_event_name_'+si).text();
            let resultId = resultData['result_id_'+si];
            let points = Number(resultData['point_'+si]);
            let errors = Number(resultData['error_'+si]);
            let mm = resultData['time_mm_'+si];
            let ss = resultData['time_ss_'+si];
            let ms = resultData['time_ms_'+si];
            let time = Number(mm)*60*100+Number(ss)*100+Number(ms);
            let sse = resultData['sse_'+si] ? true : false;
            var searchObj = {
                "eventId": eventId,
                "resultId": resultId,
                "points": points,
                "errors": errors,
                "time": time,
                "sse": sse
            };
            search.push(searchObj);
        }

        var participantObj = {};
        $(participant).each(function(index, obj){
            let pname = $.trim(obj.name);
            let pvalue = $.trim(obj.value);
            participantObj[pname] = pvalue;
        });

        var data = {};
        data['contestId'] = contestId;
        data['Participant'] = participantObj;
        data['EventResultList'] = search;

        $.ajax({
            type: 'POST',
            url: '/api/register',
            data: JSON.stringify(data),
            error: function(e) {
                console.log(e);
            },
            contentType: "application/json",
            success: function(result) {
                window.location.href = "/registered.html";
            }
        });

        return false;
    });
});

