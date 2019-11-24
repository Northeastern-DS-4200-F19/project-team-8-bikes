/* before document loads */
// converts to lowercase & replaces spaces with '-'
const formatStreetName = street => street.toLowerCase().replace(/\s/g, '-');

const laneTypeNames = {
    BL: "Bike Lane",
    BFBL: "Buffered Bike Lane",
    SBL: "Separated Bike Lane",
    SLM: "Shared Lane",
    PSL: "Priority Shared Lane",
    CL: "Climbing Lane/Hybrid",
    BSBL: "Bus/Bike Lane",
    SBLBL: "Shared Bike Lane/Bike Lane",
};

//const asNumber = item => item==="n/a" ? 0 : Number(item);

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

}

function formatTrafficData(data, times) {
    let newData = {
        bike: [],
        mv: []
    };

    data.filter(item => item["Direction"] === "Total")
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

// returns a list of objects with the keys "time" and "quantity" where the index represents an hour of the day
function averageTraffic(streets, times) {
    let timeTotals = {};
    let streetCount = {};
    let keys;
    times.forEach((time, i) => {
        timeTotals[i] = 0;
        streetCount[i] = 0;
    });

    streets.forEach(street => {
        timeTotals[street.time.getHours()] += Number(street.quantity);
        streetCount[street.time.getHours()]++;
    });
    keys = Object.keys(timeTotals);

    return keys.map(key => ({
        time: d3.timeParse("%H")(key),
        quantity: timeTotals[key]/streetCount[key],
    }));
}

// returns the maximum of the provided list of objects with the key "quantity"
function maxTraffic(trafficTimes) {
    return d3.max(trafficTimes, d => d.quantity);
}

function hoverText(data, bikeLaneTypeNames) {
    let blType = "Bike Lane Type: " + bikeLaneTypeNames[data.type];
    //TODO add segments
    //let stSegments = "Street Segments: ";
    return blType;
}

/* document loaded */
$(function() {
    let filterStreet;
    let bikeLaneData, trafficData;

    d3.csv("data/Street Segment Bike Lanes.csv").then(renderBarChart);
    d3.csv("data/BikeMVCounts.csv").then(renderLineChart);
    d3.csv("data/Accidents Bike Lanes.csv").then(renderAccidentBarChart);

    function renderAccidentBarChart(accidentData) {
          /*console.log("Creating Accident Bar Chart");

          let margin = {
            top:20,
            right: 40,
            bottom: 60,
            left: 40
          },
          width = 600,
          height = 480,
          totalHeight = height + margin.top + margin.bottom,
          totalWidth = width + margin.left + margin.right;


          console.log(margin.width);
          let dataset = [80, 100, 56, 120, 180, 150, 140, 120, 160,90,77];
          let barPadding = 5;
          let barWidth = (500 / dataset.length);
          let streets = ['Huntington Ave','Mass Ave','Columbus Ave','Harvard Ave','5','6','7','8','9','10','11']
          console.log(streets);

          let svg = d3.select("#accident-svg")
                      .attr("width", width)
                      .attr("height", height)
                      .attr("class", "accident-chart")
                      .append("g")
                          .attr("transform",
                              `translate(${margin.left},${margin.top})`);

            let xScale = d3.scaleLinear()
                          .domain([0, dataset.length])
                          .range([margin.left, width + margin.left]);


             let yScale = d3.scaleLinear()
                            .domain([0, 100])
                            .range([height + margin.top, margin.top]);


          let barChart = svg.selectAll("rect")
                            .data(dataset)
                            .enter()
                            .append("rect")
                            .attr("x", d => xScale(d.x+1)-10)
                            .attr("y", function(d) {
                          return 500 - d;
                        })
                            .attr("height", function(d) {
                          return d;
                        })
                            .attr("width", barWidth - barPadding)
                            .attr("transform", function (d, i) {
                              let translate = [barWidth * i, 0];
                          return "translate("+ translate +")";
                    });

                    //y axis with labels
                    let yAxis = d3.axisLeft()
                        .scale(yScale)
                        .tickSize(-width);

                    //x axis with labels
                    let xAxis = d3.axisBottom()
                        .scale(xScale)
                        .tickFormat((d, i) => streets[i]);

                    //add x and y axes to the svg
                    svg.append("g")
                        .attr("class", "yAxis")
                        .call(yAxis)
                        .attr("transform",`translate(${margin.left}, 0)`);

                    svg.append("g")
                        .attr("class", "xAxis")
                        .call(xAxis)
                        .attr("transform",`translate(0, ${totalHeight - margin.bottom})`);



                        svg.append("text")
                        .attr("transform",`translate(${width/2},${height + margin.top + 20})`)
                        .style("text-anchor", "middle")
                        .text("Streets for Accidents");*/
        let svg = d3.select(".vis-holder").append("svg")
                .attr("class", "accident-chart"),
            margin = {
                top: 20,
                right: 20,
                bottom: 30,
                left: 50
            },
            width = /*+svg.attr("width")*/400 - margin.left - margin.right,
            height = /*+svg.attr("height")*/400 - margin.top - margin.bottom,
            g = svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

        svg.attr("width", width)
            .attr("height", height);

        //let parseTime = d3.timeParse("%d-%b-%y");

        let x = d3.scaleBand()
            .rangeRound([0, width])
            .domain(accidentData.map(d => d["Location"]))
            .padding(0.1);

        let y = d3.scaleLinear()
            .rangeRound([height, 0])
            .domain([0, d3.max(accidentData, d => Number(d["Total"]))]);

        // add x axis
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // add y axis
        g.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Number of Accidents");

        // add bars for data
        g.selectAll(".bar")
            .data(accidentData)
            .enter().append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d["Location"]))
                .attr("y", d => y(Number(d["Total"])))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(Number(d["Total"])));
    }
    
    function renderBarChart(bikeLanes) {
        let streets = bikeLanes.map(d => d["Location"]);
        let headers = Object.keys(bikeLanes[0]);
        let bikeLaneTypes = headers.slice(2, 10);
        let lanes = formatBikeLaneData(bikeLanes, bikeLaneTypes);
        bikeLaneData = formatBikeLaneData(bikeLanes, bikeLaneTypes);

        let margin = {
                top: 20,
                right: 60,
                bottom: 180,
                left: 40
            },
            chart = {
                width: 550,
                height: 440,
            };
            chart.rightEdge = margin.left + chart.width;
            chart.bottomEdge = margin.top + chart.height;
            chart.totalHeight = chart.bottomEdge + margin.bottom;
            chart.totalWidth = chart.rightEdge + margin.right;

        let svg = d3.select("#vis-svg")
                .attr("width", chart.totalWidth)
                .attr("height", chart.totalHeight)
        .append("g")
            .attr("transform",
                `translate(${margin.left},${margin.top})`);

        let xScale = d3.scaleLinear()
            .domain([0, bikeLanes.length])
            .range([margin.left, chart.rightEdge]);

        // yScale is not inverted on the yScale
        let yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([chart.bottomEdge, margin.top]);

        // heightscale where the y is inverted
        let heightScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, chart.height]);

        // colors for bike lane types
        let colorScale = ["#fcd88a", "#cf7c1c", "#93c464", "#75734F", "#5eafc6", "#41a368", "#412000", "#41eae4"];

        //y axis with labels
        let yAxis = d3.axisLeft()
            .scale(yScale)
            .tickSize(-chart.width)
            .tickFormat(d => (d + "%"));

        //x axis with labels
        let xAxis = d3.axisBottom()
            .scale(xScale)
            .tickFormat((d, i) => streets[i]);

        //add x and y axes to the svg
        svg.append("g")
            .attr("class", "yAxis")
            .call(yAxis)
            .attr("transform",`translate(${margin.left}, 0)`);

        svg.append("g")
            .attr("class", "xAxis")
            .call(xAxis)
            .attr("transform",`translate(0, ${chart.bottomEdge})`);

        //rotate x axis text
        d3.select("g.xAxis")
            .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.0em")
                .attr("dy", "2.5em")
                .attr("transform", "rotate(-65)");

        d3.select("g.xAxis").selectAll("g.tick").selectAll("line");

        // Create groups for each series, rects for each segment
        let groups = svg.selectAll("g.bars")
            .data(lanes)
            .enter()
                .append("g")
                .attr("class", d => `bars street-${formatStreetName(d[0].location)}`);

        let tooltip = svg.select("g.tooltip")
            .append("g")

                .style("position", 'absolute')
                .style("z-index", "10")
                .style("visibility", "hidden")
                .style("background", d3.rgb(220, 220, 220, .7));

        // create bar rectangles
        groups.selectAll("rect.bar")
            .data(d => d)
            .enter()
                .append("rect")
                    .attr("x", d => xScale(d.x) + 8)
                    .attr("y", d => yScale(d.y) - heightScale(d.percent))
                    .attr("height", d => heightScale(d.percent))
                    .attr("width", () => 40)
                    .attr("class", d => `street-${formatStreetName(d.location)} lane-${d.type}`)
                    .attr("stroke", "#000")
                    .attr("stroke-width", "0px")
                    .style("fill", (d, i) => colorScale[i])
                    .on("mouseover", (d, i, nodes) => {
                        filterStreet = d.location;
                        updateLineChart();
                        d3.selectAll(nodes).attr("stroke-width", "5px");
                        tooltip.text(hoverText(d, laneTypeNames));
                        tooltip.style("visibility", "visible");
                    })
                    .on("mousemove", () =>
                        tooltip
                            .style("top", `${d3.event.pageY-10} px`)
                            .style("left",`${d3.event.pageX+10} px`)
                    )
                    .on("mouseout", (d, i, nodes) => {
                        tooltip.style("visibility", "hidden");
                        d3.selectAll(nodes).attr("stroke-width", "0px");
                        filterStreet = null;
                        updateLineChart();
                    });

        // text label for the x axis
        svg.append("text")
        .attr("transform",`translate(${chart.width/2},${chart.bottomEdge + 125})`)
        .style("text-anchor", "middle")
        .text("Streets");

        // text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left)
            .attr("x",0 - (chart.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Percentage of Street");

        // Add a title
        svg.append("text")
            .attr("x", chart.width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("text-decoration", "underline")
            .text("Bike Lanes on Boston Streets");

        // Create Legend
        // create g for legend to go into
        let radius = 6;
        let svgLegend = svg.append('g')
                    .attr('class', 'gLegend')
                    .attr("transform", `translate(${chart.rightEdge + 10},${margin.top+40})`);

        // place legend on svg
        let legend = svgLegend.selectAll('.legend')
               .data(bikeLaneTypes)
               .enter().append('g')
                 .attr("class", "legend")
                 .attr("transform", (d, i) => `translate(0,${i*20})`);

        // add color circles to legend
        legend.append("circle")
            .attr("class", "legend-node")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", radius)
            .style("fill", (d, i) => colorScale[i]);

        // add text to legend
        legend.append("text")
            .attr("class", "legend-text")
            .attr("x", radius*2)
            .attr("y", radius/2)
            .style("fill", "#272727")
            .style("font-size", 12)
            .text(d=>laneTypeNames[d]);
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
        trafficData = formatTrafficData(data, times);

        // set the ranges
        let x = d3.scaleTime()
            .domain(d3.extent(trafficData.bike.map(d => d.time)))
            .range([0, width]);
        let y = d3.scaleLinear()
            .domain([0, maxTraffic(averageTraffic(trafficData.mv, times), d => d.quantity)])
            .range([height, 0]);

        // define the line
        let valueLine = d3.line()
            .x(d => x(d.time))
            .y(d => y(d.quantity));

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        let group = d3.select(".vis-holder")
            .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("class", "line-chart")
                .append("g")
                    .attr("transform",`translate(${margin.left},${margin.top})`);

        // Add the valueLine path for bikes
        group.append("path")
            .data([averageTraffic(trafficData.bike, times)])
            .attr("class", "line bike")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", d => d.type)
            .attr("stroke", "#b35a2d");

        // add average bike line
        group.append("path")
            .data([averageTraffic(trafficData.bike, times)])
            .attr("class", "line bike-average")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", d => d.type)
            .attr("stroke", "rgba(179,90,45,0.3)");

        //add bike icon
        group.append("image")
            .attr("class", "icon bike")
            .attr("x", 5)
            .attr("y", y(averageTraffic(trafficData.bike, times)[0].quantity) - 20)
            .attr("width", 20)
            .attr("height", 20)
            .attr("href", "images/bike-icon.png");

        // Add the valueLine path for motor vehicles
        group.append("path")
            .data([averageTraffic(trafficData.mv, times)])
            .attr("class", "line mv")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", "Motor Vehicles")
            .attr("stroke", "#346d94");

        // Add average motor vehicle line
        group.append("path")
            .data([averageTraffic(trafficData.mv, times)])
            .attr("class", "line mv-average")
            .attr("d", valueLine)
            .attr("fill", "none")
            .attr("data-legend", "Motor Vehicles")
            .attr("stroke", "rgba(52,109,148,0.3)");

        //add mv icon
        group.append("image")
            .attr("class", "icon mv")
            .attr("x", 5)
            .attr("y", y(averageTraffic(trafficData.mv, times)[0].quantity) - 20)
            .attr("width", 20)
            .attr("height", 20)
            .attr("href", "images/car-icon.png");

        // Add the X Axis
        group.append("g")
            .attr("transform", `translate(0,${height})`)
            .attr("class", "x-axis")
            .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%I %p")));

        // Add the Y Axis
        group.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y));

        // text label for the x axis
        group.append("text")
            .attr("transform",`translate(${width/2},${height + margin.top - 20})`)
            .style("text-anchor", "middle")
            .style("font-size", "13px")
            .text("Time of Day");

        // text label for the y axis
        group.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "13px")
            .text("Average Vehicle Count");

        // Add a title
        d3.select(".line-chart")
            .append("g")
            .attr("class", "title")
                .append("text")
                    .attr("x", (width / 2))
                    .attr("y", (margin.top / 2))
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .style("text-decoration", "underline")
                    .text("Average Car and Bike Vehicle Counts");
    }

    function updateLineChart() {
        let svg = d3.select(".line-chart");
        let group = svg.select("g");
        let filteredData = {};
        Object.keys(trafficData)
            .forEach(type => filteredData[type] = trafficData[type]
                .filter(traffic => filterStreet===null || traffic.street===filterStreet));
        let times = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
        let height = svg.attr("height");
        let width = svg.attr("width");

        let x = d3.scaleTime()
            .domain(d3.extent(times.map(d => d3.timeParse("%H")(d))))
            .range([0, width-100]);
        let y = d3.scaleLinear()
            .domain([0, maxTraffic(averageTraffic(trafficData.mv, times))])
            .range([height-140, 0]);
        let valueLine = d3.line()
            .x(d => x(d.time))
            .y(d => y(d.quantity));

        //update bike line
        group.select(".line.bike")
            .data([averageTraffic(filteredData.bike, times)])
            .transition()
                .duration(300)
                .ease(d3.easeLinear)
                .attr("d", valueLine);

        //update mv line
        group.select(".line.mv")
            .data([averageTraffic(filteredData.mv, times)])
            .transition()
                .duration(300)
                .ease(d3.easeLinear)
                .attr("d", valueLine);

        //update mv icon
        d3.select(".icon.mv").transition()
            .duration(300)
            .ease(d3.easeLinear)
            .attr("y", y(averageTraffic(filteredData.mv, times)[0].quantity) - 20);

        //update bike icon
        d3.select(".icon.bike").transition()
            .duration(300)
            .ease(d3.easeLinear)
            .attr("y", y(averageTraffic(filteredData.bike, times)[0].quantity) - 20);

        //update chart title
        svg.select(".title text")
            .text("Average Car and Bike Vehicle Counts" + (filterStreet ? ` on ${filterStreet}` : ""));
    }
});
