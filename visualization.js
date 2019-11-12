/* before document loads */
// converts to lowercase & replaces spaces with '-'
const formatStreetName = street => street.toLowerCase().replace(/\s/g, '-');

const asNumber = item => item==="n/a" ? 0 : Number(item);

const removeSection = streetName => {
    let temp = streetName.split(" ");
    return temp.slice(0, temp.indexOf("of")-1).join(" ");
};

// create one data object for each bike lane type on each street
function formatBikeLaneData(data, bikeLaneTypes) {
    let newData = [];

    data.forEach((d, i) => {
        let bikeLanes = [];
        bikeLaneTypes.forEach((bl, j) => {
            bikeLanes.push({
                location: d["Location"],
                neighborhood: d["Neighborhood"],
                type: bl,
                segments: d["Segments"],
                percent: d[bl],
                x: i,
                y: j>0 ? Number(bikeLanes[j-1].y) + Number(bikeLanes[j-1].percent) : 0,
            })
        });
        newData.push(bikeLanes);
    });

    return newData;
}

function formatAccidentData(data) {
    let newData = [];

    data.forEach((d, i) => {
        let bikeLanes = [];
        bikeLaneTypes.forEach((bl, j) => {
            bikeLanes.push({
                location: d["Location"],
                neighborhood: d["Neighborhood"],
                type: bl,
                segments: d["Segments"],
                percent: d[bl],
                x: i,
                y: j>0 ? Number(bikeLanes[j-1].y) + Number(bikeLanes[j-1].percent) : 0,
            })
        });
        newData.push(bikeLanes);
    });

    return newData;
}

function formatTrafficData(data, times) {
    let newData = {
        bike: [],
        mv: []
    };

    data.filter(item => item["Direction"]==="Total")
        .forEach(street => {
            times.forEach(time => {
                let list = street["Vehicle Type"]==="Bike" ? newData.bike : newData.mv;
                list.push({
                    time: d3.timeParse("%I %p")(time),
                    quantity: street[time],
                    location: street["Location"],
                    type: street["Vehicle Type"],
                    street: removeSection(street["Location"])
                });
            });
        });

    return newData;
}

function totalTraffic(streets, times) {
    let timeTotals = {};
    let keys;
    times.forEach((time, i) => timeTotals[i] = 0);

    streets.forEach(street =>
        timeTotals[street.time.getHours()] += Number(street.quantity)
    );
    keys = Object.keys(timeTotals);

    return keys.map(key => ({
        time: d3.timeParse("%H")(key),
        quantity: timeTotals[key]
    }))
}

function returnText(data) {
    let bl_type = "Bike Lane Type: " + data.type;
    let st_segments = "Street Segments: "
    return bl_type + '\n' + st_segments
}

/* document loaded */
$(function() {
    d3.csv("data/Street Segment Bike Lanes.csv")
        .then((bikeLanes) => d3.csv("data/Accidents Bike Lanes.csv")
            .then((accidents) => renderBarChart(bikeLanes, accidents)));
    d3.csv("data/BikeMVCounts.csv").then(renderLineChart);

    function renderBarChart(bikeLanes, accidents) {
        let streets = bikeLanes.map(d => d.location);
        let headers = Object.keys(bikeLanes[0]);
        let bikeLaneTypes = headers.slice(2, 10);
        let lanes = formatBikeLaneData(bikeLanes, bikeLaneTypes);

        let margin = {
            top: 80,
            right: 20,
            bottom: 80,
            left: 80
        },
        width = 550,
        height = 500;

        let svg = d3.select("#vis-svg")
                .attr("width", width)
                .attr("height", height)
        .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");;

        let xScale = d3.scaleLinear()
            .domain([0, bikeLanes.length])
            .range([20, 480]);

        // yScale is not inverted on the yScale
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([480,20]);

        // heightscale where the y is inverted
        let heightScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, 460]);

        let colorScale = ["#fcd88a", "#cf7c1c", "#93c464", "#75734F", "#5eafc6", "#41a368", "#41a000", "#41eae4"];

        let yAxis = d3.axisLeft()
            .scale(yScale)
            .tickSize(-500);

        let xAxis = d3.axisBottom()
            .scale(xScale)
            .tickFormat((d) => d.location);

        svg.append("g")
            .attr("class", "yAxis")
            .call(yAxis)
            .attr("transform",`translate(${20}, 0)`);

        svg.append("g")
            .attr("class", "xAxis")
            .call(xAxis)
            .attr("transform",`translate(0, ${480})`);

        d3.select("g.xAxis").selectAll("g.tick").selectAll("text");

        d3.select("g.xAxis").selectAll("g.tick").selectAll("line");

        // Create groups for each series, rects for each segment
        let groups = svg.selectAll("g.bars")
            .data(lanes)
            .enter()
                .append("g")
                .attr("class", d => `bars street-${formatStreetName(d[0].location)}`);
        
        var tooltip = d3.select("body")
            .append("div")
            .style("position", 'absolute')
            .style("z-index", "10")
            .style("visibility", "hidden")
            .style("background", "#eee")
            .text("a simple tooltip");

        // create bar rectangles
        let rect = groups.selectAll("rect")
            .data(d => d)
            .enter()
                .append("rect")
                    .attr("x", d => xScale(d.x+1)-10)
                    .attr("y", d => yScale(d.y)-heightScale(d.percent))
                    .attr("height", d => heightScale(d.percent))
                    .attr("width", () => 25)
                    .attr("class", d => `street-${formatStreetName(d.location)} lane-${d.type}`)
                    .style("fill", (d, i) => colorScale[i])
                    .on("mouseover", function(d){tooltip.text(returnText(d)); return tooltip.style("visibility", "visible");})
                    .on("mousemove", function(){return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");})
                    .on("mouseout", function(){return tooltip.style("visibility", "hidden");});
        
        // text label for the x axis
        svg.append("text")             
        .attr("transform","translate(" + (width/2) + " ," + (height + 40) + ")")
        .style("text-anchor", "middle")
        .text("Streets");

        // text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Percentage of Street");

        // Add a title
        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", -20)
            .attr("text-anchor", "middle")  
            .style("font-size", "24px") 
            .style("text-decoration", "underline")  
            .text("Bike Lanes for Boston Streets");            

        svg.append("svg")
    }

    function renderLineChart(data) {
        let margin = {
                top: 60,
                right: 20,
                bottom: 80,
                left: 80
            },
            width = 590 - margin.left - margin.right,
            height = 405 - margin.top - margin.bottom;
        let parseTime = d3.timeParse("%I %p");
        let times = Object.keys(data[0]).filter(key => parseTime(key) != null);
        let traffic = formatTrafficData(data, times);


        // set the ranges
        let x = d3.scaleTime()
            .domain(d3.extent(traffic.bike.map(d => d.time)))
            .range([0, width]);
        let y = d3.scaleLinear()
            .domain([0, d3.max(totalTraffic(traffic.mv, times), d => d.quantity)])
            .range([height, 0]);

        console.log(totalTraffic(traffic.bike, times));

        // define the line
        let valueLine = d3.line()
            .x(d => (x(d.time)))
            .y(d => (y(d.quantity)));

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        let svg = d3.select(".vis-holder")
            .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Add the valueLine path for bikes
        svg.append("path")
            .data([totalTraffic(traffic.bike, times)])
            .attr("class", "line bike")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("stroke", "#b35a2d");

        // Add the valueLine path for motor vehicles
        svg.append("path")
            .data([totalTraffic(traffic.mv, times)])
            .attr("class", "line mv")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("stroke", "#346d94");

        // Add the X Axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the Y Axis
        svg.append("g")
            .call(d3.axisLeft(y));
        
        // text label for the x axis
        svg.append("text")             
        .attr("transform","translate(" + (width/2) + " ," + (height + 75) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "13px")
        .text("Time of Day");

        // text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "13px")
            .text("Traffic Level");

        // Add a title
        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")  
            .style("font-size", "16px") 
            .style("text-decoration", "underline")  
            .text("Car and Bike Traffic Levels");
    }
});


