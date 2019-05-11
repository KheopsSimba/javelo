function dateDiff(date1, date2){
    var diff = {};                         // Initialisation du retour
    var tmp = date2 - date1;

    tmp = Math.floor(tmp/1000);             // Nombre de secondes entre les 2 dates
    diff.sec = tmp % 60;                    // Extraction du nombre de secondes

    tmp = Math.floor((tmp-diff.sec)/60);    // Nombre de minutes (partie entière)
    diff.min = tmp % 60;                    // Extraction du nombre de minutes

    tmp = Math.floor((tmp-diff.min)/60);    // Nombre d'heures (entières)
    diff.hour = tmp % 24;                   // Extraction du nombre d'heures

    tmp = Math.floor((tmp-diff.hour)/24);   // Nombre de jours restants
    diff.day = tmp;

    return diff;
}

function toogleDataSeries(e){
    if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
        e.dataSeries.visible = false;
    } else{
        e.dataSeries.visible = true;
    }
    e.chart.render();
}

//This will sort your array
function sortByDate(a, b){
    var aDateArray = a.date.split('/');
    var bDateArray = b.date.split('/');
    var aDate = new Date(aDateArray[2], aDateArray[0], aDateArray[1]);
    var bDate = new Date(bDateArray[2], bDateArray[0], bDateArray[1]);
    return ((dateDiff(aDate, bDate).day > 0) ? -1 : ((dateDiff(aDate, bDate).day < 0) ? 1 : 0));
}

//Nombre d'objectifs enregistrés
function getNbObj(){
    var nbObjectives = 0;
    if(localStorage.length) {
        $.each(localStorage, function (key, object) {
            if (key.startsWith('o')) {
                nbObjectives++;
            }
        });
    }
    return nbObjectives;
}

//Nombre de progrès enregistrés
function getNbPro(){
    var nbProgress = 0;
    if(localStorage.length) {
        $.each(localStorage, function (key, object) {
            if (key.startsWith('p')) {
                nbProgress++;
            }
        });
    }
    return nbProgress;
}

//récupérer tous les progrès pour objectif donné
function getProgressesForObj(object_id){
    var progresses = [];
    $.each(localStorage, function (k, p) {
        if (k.startsWith('p')) {
            var p_json = JSON.parse(p);
            if (parseInt(p_json.objective_id) == object_id) {
                progresses.push(p_json);
            }
        }
    });
    if(progresses.length > 1){
        progresses.sort(sortByDate);
    }
    return progresses;
}



$(function(){
    $( '#start_date' ).datepicker();
    $( '#end_date' ).datepicker();

    if(localStorage.length){
        //Afficher la liste de tous les objectifs avec les données et le graphique correspondant
        var nbObjectives = getNbObj();
        $('#list').append('<ul></ul>');
        for(i=1; i<=nbObjectives; i++){
            var object_json = JSON.parse(localStorage.getItem('o'+i));
            var object_id = object_json.id;
            //progres correspondant le plus récent
            var p_key = null;
            var p_date = null;
            $.each(localStorage, function(k,o){
                if(k.startsWith('p')){
                    var p_json = JSON.parse(o);
                    if(parseInt(p_json.objective_id) == object_id){
                        if(p_date == null){
                            //premier progrès pour cet objectif
                            p_key = k;
                            var p_dateArray = p_json.date.split('/');
                            p_date = new Date(p_dateArray[2], p_dateArray[0], p_dateArray[1]);
                        }else{
                            //un autre progrès
                            var p_dateArray = p_json.date.split('/');
                            var p_dateTmp = new Date(p_dateArray[2], p_dateArray[0], p_dateArray[1]);
                            if(dateDiff(p_dateTmp, p_date).day < 0){
                                //si il est plus récent
                                p_key = k;
                                p_date = p_dateTmp;
                            }
                        }
                    }
                }
            });
            var progress = null;
            var progress_json = null;
            if(p_key != null){
                progress = localStorage.getItem(p_key);
                progress_json = JSON.parse(progress);
            }
            var line = '<li id="obj'+object_json.id+'">Objectif '+object_id+' Start: '+object_json.start+
                ' Target: '+object_json.target+' Start date: '+object_json.start_date+' End date: '+object_json.end_date
                +' <span class="progress">Progress: ';
            if(progress_json != null){
                line += progress_json.value;
                if(typeof progress_json.excess != 'undefined'){
                    line += ' Excess: '+progress_json.excess;
                }
                line += '</span><input type="button" class="modify" name="mod'+progress_json.id+'" value="Modifier la progression" /></li>';
            }else{
                line += '</span><input type="button" class="add" name="add'+object_id+'" value="Ajouter une progression" /></li>';
            }
            $('#list ul').append(line);

            //Graphique
            //courbe théorique
            var startDateArray = object_json.start_date.split('/');
            var startDate = new Date(startDateArray[2], startDateArray[0]-1, startDateArray[1]);
            var endDateArray = object_json.end_date.split('/');
            var endDate = new Date(endDateArray[2], endDateArray[0]-1, endDateArray[1]);
            //calculer le nombres de jours pour réaliser l'objectif
            var deltaObj = dateDiff(startDate, endDate).day;
            //combien réaliser par jour
            var workPerDay = deltaObj/(parseInt(object_json.target)-parseInt(object_json.start));

            //récupérer tous les progrès pour l'objectif
            var progresses = getProgressesForObj(object_id);
            var datas = [];
            var datasTheoric = [];
            var firstPro = true;
            $.each(progresses, function (i, p) {
                var progress = parseInt(p.value);
                var progressDateArray = p.date.split('/');
                var progressDate = new Date(progressDateArray[2], parseInt(progressDateArray[0])-1, progressDateArray[1]);
                if(firstPro && dateDiff(startDate, progressDate).day > 0){
                    var data = {x: startDate, y: parseInt(object_json.start)};
                    datas.push(data);
                    datasTheoric.push(data);
                    firstPro = false;
                }
                var data = {x: progressDate, y: progress};
                datas.push(data);
                //calculer nombre de jours écoulés à cette date
                var days = dateDiff(startDate, progressDate).day;
                var dataTheoric = {x: progressDate, y: days*workPerDay+parseInt(object_json.start)};
                datasTheoric.push(dataTheoric);
            });

            var options = {
                animationEnabled: true,
                theme: "light2",
                title: {
                    text: 'Progression Objectif '+object_json.id
                },
                axisX: {
                    valueFormatString: "MMM DD"
                },
                axisY: {
                    title: "Target",
                    suffix: "",
                    minimum: 0
                },
                toolTip: {
                    shared: true
                },
                legend: {
                    cursor: "pointer",
                    verticalAlign: "bottom",
                    horizontalAlign: "left",
                    dockInsidePlotArea: true,
                    itemclick: toogleDataSeries
                },
                data: [{
                    type: "line",
                    showInLegend: true,
                    name: "Progress",
                    markerType: "square",
                    xValueFormatString: "DD MMM, YYYY",
                    color: "#F08080",
                    yValueFormatString: "#,##0",
                    dataPoints: datas
                },
                    {
                        type: "line",
                        showInLegend: true,
                        name: "Theoric progress",
                        lineDashType: "dash",
                        yValueFormatString: "#,##0",
                        dataPoints: datasTheoric
                    }]
            };
            $('#list #obj'+object_json.id).append('<div class="chartContainer chart'+object_json.id+'"></div>');
            $('.chart'+object_json.id).CanvasJSChart(options);
        }
    }else{
        $('#list').append('<p>Aucun objectif enregistré</p>');
    }

    //Créer un objectif
    $(document).on('click', '#submit', function(){
        //vérifications dates
        var start_date = $('#start_date').val();
        var end_date = $('#end_date').val();
        var start = $('#start').val();
        var target = $('#target').val();
        var progress = $('#progress').val();
        var d = new Date();
        var month = d.getMonth()+1;
        var day = d.getDate();
        var today = (month<10 ? '0' : '') + month + '/' +
            (day<10 ? '0' : '') + day + '/' + d.getFullYear();
        if(start_date == '' || end_date == ''){
            alert('Vous devez remplir toutes les dates');
            return false;
        }
        var startDateArray = start_date.split('/');
        var endDateArray = end_date.split('/');
        var todayDate = new Date(d.getFullYear(), month, day);
        var startDate = new Date(startDateArray[2], startDateArray[0], startDateArray[1]);
        var endDate = new Date(endDateArray[2], endDateArray[0], endDateArray[1]);
        if(dateDiff(today, endDate).day < 0){
            alert('Objectif irréalisable');
            return false;
        }
        //calculer le nombres de jours pour réaliser l'objectif
        var deltaObj = dateDiff(startDate, endDate).day;
        if(deltaObj < 0){
            alert('La date de début doit être inférieure à la date de fin de l\'objectif');
            return false;
        }

        var deltaStart = dateDiff(startDate, todayDate).day;

        if(start != '' && target != '' &&
            $.isNumeric(start) && $.isNumeric(target)){

            var realProgress = progress;
            if(realProgress == ''){
                realProgress = start;
            }
            if(realProgress < parseInt(start)){
                alert('Progress ne peut pas être inférieur à Start');
                return false;
            }
            if(realProgress < 0){
                alert('Progress ne peut pas être négatif');
                return false;
            }

            //combien réaliser par jour
            var workPerDay = deltaObj/(parseInt(target)-parseInt(start));

            if(localStorage.length == 0) {
                var objectif = {'id': 1, 'start': start, 'target': target, 'start_date': start_date, 'end_date': end_date};
                localStorage.setItem('o1', JSON.stringify(objectif));
                if(realProgress != '' && $.isNumeric(realProgress)){
                    //calculer l'excès initial si la date de début de l'objectif est passée
                    if(deltaStart > 0){
                        //combien on devrait avoir réalisé
                        var workDoneTheoric = deltaStart*workPerDay;
                        var workDone = parseInt(realProgress);
                        var excess = workDone-workDoneTheoric-parseInt(start);
                        var progress = {'id': 1, 'objective_id': 1, 'value': realProgress, 'date': today, 'excess': excess};
                    }else{
                        var progress = {'id': 1, 'objective_id': 1, 'value': realProgress, 'date': today};
                    }
                    localStorage.setItem('p1', JSON.stringify(progress));
                }else if(realProgress != ''){
                    alert('Le progrès ne sera pas sauvegardé pour cet objectif car vous n\'avez pas tapé un entier');
                }

                location.reload(true);
            }else{
                var nbObjective = getNbObj() + 1;
                var objectif = {'id': nbObjective, 'start': start, 'target': target, 'start_date': start_date, 'end_date': end_date};
                localStorage.setItem('o'+nbObjective, JSON.stringify(objectif));
                if(realProgress != '' && $.isNumeric(realProgress)){
                    var i = getNbPro()+1;
                    if(deltaStart > 0){
                        //combien on devrait avoir réalisé
                        var workDoneTheoric = deltaStart*workPerDay;
                        var workDone = parseInt(realProgress);
                        var excess = workDone-workDoneTheoric-parseInt(start);
                        var progress = {'id': i, 'objective_id': nbObjective, 'value': realProgress, 'date': today, 'excess': excess};
                    }else{
                        var progress = {'id': i, 'objective_id': nbObjective, 'value': realProgress, 'date': today};
                    }
                    localStorage.setItem('p'+i, JSON.stringify(progress));
                }else if(realProgress != ''){
                    alert('Le progrès ne sera pas sauvegardé pour cet objectif car vous n\'avez pas tapé un entier');
                }
                location.reload(true);
            }
        }else{
            alert('Vous n\'avez pas rempli tous les champs correctement');
        }
    }).on('click', '.modify', function(){
        //Modification d'un objectif
        //récupérer objectif
        var objStr = $(this).parent().attr('id');
        var idObj = objStr[objStr.length-1];
        var object_json = JSON.parse(localStorage.getItem('o'+idObj));
        //dates
        var startDateArray = object_json.start_date.split('/');
        var endDateArray = object_json.end_date.split('/');
        var d = new Date();
        var month = d.getMonth()+1;
        var day = d.getDate();
        var today = (month<10 ? '0' : '') + month + '/' +
            (day<10 ? '0' : '') + day + '/' + d.getFullYear();
        var todayDate = new Date(d.getFullYear(), month, day);
        //calculer le nombres de jours pour réaliser l'objectif
        var startDate = new Date(startDateArray[2], startDateArray[0], startDateArray[1]);
        var endDate = new Date(endDateArray[2], endDateArray[0], endDateArray[1]);
        var deltaStart = dateDiff(startDate, todayDate).day;
        var deltaObj = dateDiff(startDate, endDate).day;
        //combien réaliser par jour
        var workPerDay = deltaObj/(object_json.target-object_json.start);

        if($(this).parent().find('.progress input').length){
            var field = $(this).parent().find('.progress input');
            if(field.val() != '' && $.isNumeric(field.val())){
                if(parseInt(field.val()) < 0){
                    alert('Progress ne peut pas être négatif');
                    return false;
                }
                var name = field.attr('name');
                var p_id = name[name.length-1];
                var progress = JSON.parse(localStorage.getItem('p'+p_id));
                var i = getNbPro()+1;
                if(deltaStart > 0){
                    //combien on devrait avoir réalisé
                    var workDoneTheoric = deltaStart*workPerDay;
                    //combien on a vraiment réalisé
                    var workDone = parseInt(field.val());
                    //écart
                    var excess = workDone-workDoneTheoric-object_json.start;
                    //vérifier date progrès
                    var progressDateArray = progress.date.split('/');
                    var progressDate = new Date(progressDateArray[2], progressDateArray[0], progressDateArray[1]);
                    if(dateDiff(todayDate, progressDate).day == 0){
                        //on modifie le progrès existant
                        var progress_modified = {'id': p_id,'objective_id': progress.objective_id, 'value': field.val(), 'date': today, 'excess': excess};
                    }else{
                        //on mémorise un nouveau progrès
                        var progress_modified = {'id': i,'objective_id': progress.objective_id, 'value': field.val(), 'date': today, 'excess': excess};
                    }
                }else{
                    //vérifier date progrès
                    var progressDateArray = progress.date.split('/');
                    var progressDate = new Date(progressDateArray[2], progressDateArray[0], progressDateArray[1]);
                    if(dateDiff(todayDate, progressDate).day == 0){
                        //on modifie le progrès existant
                        var progress_modified = {'id': p_id,'objective_id': progress.objective_id, 'value': field.val(), 'date': today};
                    }else{
                        //on mémorise un nouveau progrès
                        var progress_modified = {'id': i,'objective_id': progress.objective_id, 'value': field.val(), 'date': today};
                    }
                }

                localStorage.setItem(name, JSON.stringify(progress_modified));
                location.reload(true);
            }else{
                alert('Vous n\'avez pas rempli le progrès correctement');
            }
        }else{
            var name = $(this).attr('name');
            var p_id = name[name.length-1];
            var progress = JSON.parse(localStorage.getItem('p'+p_id));
            var o_id = progress.objective_id;

            $('#obj'+o_id).find('.progress').html('Progress <input type="text" name="p'+p_id+'" />');
        }

    });
});