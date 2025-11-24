// Faculty to JSON file mapping
const facultyMapping = {
    'ARCHITECTURE': 'data/foa.json',
    'BUSINESS': 'data/sbs.json',
    'COMPUTING': 'data/foc.json',
    'ENGINEERING': 'data/foe.json',
    'HUMANITIES': 'data/fohs.json'
};

// Store loaded faculty data
let currentFacultyData = null;
let moduleData = {};

// Grade points table
const gradePoints = {
    'A+': 4.0,
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D+': 1.3,
    'D': 1.0,
    'E': 0.0,
    'F': 0.0,
    '': 0.0
};

function abbreviateModuleName(fullName) {
    return fullName
        .split(' ')
        .filter(word => word !== '&' && word !== 'and' && word !== '-')
        .map(word => word.charAt(0).toUpperCase())
        .join('');
}

function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Load and transform JSON data for a faculty
async function loadFacultyData(facultyCode) {
    try {
        const jsonFile = facultyMapping[facultyCode];
        if (!jsonFile) {
            throw new Error('Invalid faculty selection');
        }

        const response = await fetch(jsonFile);
        if (!response.ok) {
            throw new Error('Failed to load faculty data.');
        }

        const data = await response.json();
        currentFacultyData = data;

        const transformed = {};

        Object.keys(data.programs).forEach(programName => {
            const program = data.programs[programName];
            transformed[programName] = {};

            // Group courses by "Year X - Semester Y"
            program.courses.forEach(course => {
                const key = `Year ${course.year} - Semester ${course.semester}`;
                if (!transformed[programName][key]) {
                    transformed[programName][key] = [];
                }
                transformed[programName][key].push({
                    code: course.code,
                    name: course.name,
                    credits: course.credits
                });
            });
        });

        return transformed;
    } catch (error) {
        console.error('Error loading faculty data:', error);
        showMessage('error', 'Failed to load faculty data. Please try again. (If you are running index.html, please refer README.md)');
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const facultySelect = document.getElementById('faculty');
    const departmentSelect = document.getElementById('department');

    facultySelect.addEventListener('change', async function() {
        const faculty = this.value;
        departmentSelect.innerHTML = '<option value="">Select Department</option>';
        departmentSelect.disabled = true;

        hideMessage('error');
        hideMessage('success');
        hideModules();
        hideResults();

        if (faculty) {
            // Load faculty JSON data
            const transformed = await loadFacultyData(faculty);

            if (transformed) {
                moduleData = transformed;

                // Get program names
                let programs = Object.keys(transformed);

                // Special handling for Computing faculty
                if (faculty === 'COMPUTING') {
                    // short names for Computing programs
                    const abbreviations = {
                        'Artificial Intelligence': 'AI',
                        'Computer Science': 'CS',
                        'Computer Systems Engineering': 'CSE',
                        'Computer Systems Network Engineering': 'CSNE',
                        'Cyber Security': 'CS',
                        'Data Science': 'DS',
                        'Information Systems Engineering': 'ISE',
                        'Information Technology': 'IT',
                        'Interactive Media': 'IM',
                        'Software Engineering': 'SE'
                    };

                    // put CS, CSE first :)
                    const priority = ['Computer Science', 'Computer Systems Engineering'];
                    const priorityPrograms = programs.filter(p => priority.includes(p));
                    const otherPrograms = programs.filter(p => !priority.includes(p)).sort();
                    programs = [...priorityPrograms, ...otherPrograms];

                    departmentSelect.disabled = false;
                    programs.forEach(programName => {
                        const option = document.createElement('option');
                        option.value = programName;
                        const abbr = abbreviations[programName];
                        option.textContent = abbr ? `${programName} (${abbr})` : programName;
                        departmentSelect.appendChild(option);
                    });
                } else {
                    programs.sort();
                    departmentSelect.disabled = false;

                    programs.forEach(programName => {
                        const option = document.createElement('option');
                        option.value = programName;
                        option.textContent = programName;
                        departmentSelect.appendChild(option);
                    });
                }
            }
        }
    });

    departmentSelect.addEventListener('change', function() {
        const department = this.value;

        if (department && moduleData[department]) {
            loadModules(department);
        }
    });
});

function loadModules(programName) {
    const modulesSection = document.getElementById('modulesSection');
    const actionButtons = document.getElementById('actionButtons');
    const semesterTabs = document.getElementById('semesterTabs');
    const semesterContents = document.getElementById('semesterContents');

    semesterTabs.innerHTML = '';
    semesterContents.innerHTML = '';

    const modules = moduleData[programName];

    if (!modules) {
        showMessage('error', 'Module data not found for selected program');
        return;
    }

    // Group semesters by year
    const semestersByYear = {};
    Object.keys(modules).forEach(semesterName => {
        const yearMatch = semesterName.match(/Year (\d+)/);
        if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            if (!semestersByYear[year]) {
                semestersByYear[year] = {};
            }
            const semesterMatch = semesterName.match(/Semester (\d+)/);
            const semesterNum = semesterMatch ? parseInt(semesterMatch[1]) : 1;
            semestersByYear[year][semesterNum] = {
                name: semesterName,
                modules: modules[semesterName]
            };
        }
    });

    // Create year tabs
    const years = Object.keys(semestersByYear).sort((a, b) => a - b);
    years.forEach((year, index) => {
        // Create tab for this year
        const tab = document.createElement('div');
        tab.className = 'semester-tab' + (index === 0 ? ' active' : '');
        tab.textContent = `Year ${year}`;
        tab.onclick = () => switchYear(year);
        semesterTabs.appendChild(tab);

        const yearContent = document.createElement('div');
        yearContent.className = 'semester-content' + (index === 0 ? ' active' : '');
        yearContent.id = `year-${year}`;

        const semestersGrid = document.createElement('div');
        semestersGrid.className = 'semesters-grid';

        [1, 2].forEach(semNum => {
            if (semestersByYear[year][semNum]) {
                const semData = semestersByYear[year][semNum];
                const semesterContainer = document.createElement('div');
                semesterContainer.className = 'semester-container';

                const semesterHeader = document.createElement('div');
                semesterHeader.className = 'semester-header';
                semesterHeader.textContent = `Semester ${semNum}`;
                semesterContainer.appendChild(semesterHeader);

                const table = document.createElement('table');
                table.className = 'modules-table';
                const isMobile = isMobileDevice();
                const headerName = isMobile ? 'Name' : 'Module Name';
                const headerCredits = isMobile ? 'Cr.' : 'Credits';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>${headerName}</th>
                            <th>${headerCredits}</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${semData.modules.map((module, i) => {
                            const displayName = isMobile ? abbreviateModuleName(module.name) : module.name;
                            return `
                            <tr>
                                <td class="module-code">${module.code}</td>
                                <td class="module-name" title="${module.name}">${displayName}</td>
                                <td class="credits">${module.credits}</td>
                                <td>
                                    <select class="grade-select"
                                            id="grade-${module.code}"
                                            data-credits="${module.credits}"
                                            data-semester="${semData.name}"
                                            onchange="handleGradeChange(this)">
                                        <option value="">Select</option>
                                        <option value="A+">A+</option>
                                        <option value="A">A</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B">B</option>
                                        <option value="B-">B-</option>
                                        <option value="C+">C+</option>
                                        <option value="C">C</option>
                                        <option value="C-">C-</option>
                                        <option value="D+">D+</option>
                                        <option value="D">D</option>
                                        <option value="E">E</option>
                                        <option value="F">F</option>
                                    </select>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                `;

                semesterContainer.appendChild(table);
                semestersGrid.appendChild(semesterContainer);
            }
        });

        yearContent.appendChild(semestersGrid);
        semesterContents.appendChild(yearContent);
    });

    modulesSection.classList.add('active');
    actionButtons.classList.add('active');
}

function switchYear(year) {
    // Update tab active states
    document.querySelectorAll('.semester-tab').forEach(tab => {
        if (tab.textContent === `Year ${year}`) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update content active states
    document.querySelectorAll('.semester-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(`year-${year}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

function handleGradeChange(select) {
    if (select.value) {
        select.classList.add('grade-entered');
    } else {
        select.classList.remove('grade-entered');
    }
}

function calculateGPA() {
    const gradeSelects = document.querySelectorAll('.grade-select');
    let semesterData = {};
    let yearData = {};
    let totalPoints = 0;
    let totalCredits = 0;

    gradeSelects.forEach(select => {
        const grade = select.value;
        const credits = parseInt(select.dataset.credits);
        const semester = select.dataset.semester;

        if (grade) {
            const points = gradePoints[grade] * credits;

            if (!semesterData[semester]) {
                semesterData[semester] = {
                    points: 0,
                    credits: 0
                };
            }

            semesterData[semester].points += points;
            semesterData[semester].credits += credits;
            totalPoints += points;
            totalCredits += credits;

            const yearMatch = semester.match(/Year (\d+)/);
            if (yearMatch) {
                const year = parseInt(yearMatch[1]);
                if (!yearData[year]) {
                    yearData[year] = {
                        points: 0,
                        credits: 0
                    };
                }
                yearData[year].points += points;
                yearData[year].credits += credits;
            }
        }
    });

    if (totalCredits === 0) {
        showMessage('error', 'Please enter at least one grade to calculate GPA');
        return;
    }

    const gpa = totalPoints / totalCredits;

    let wgpa = 0;

    // Get WGPA weights
    if (currentFacultyData && currentFacultyData.wgpaWeights) {
        const weightKeys = Object.keys(currentFacultyData.wgpaWeights);
        let selectedWeightKey = weightKeys[0]; // Default to first

        // For FOC 
        const currentProgram = document.getElementById('department').value;
        if (currentFacultyData.facultyCode === 'FOC') {
            if (currentProgram === 'Computer Science' || currentProgram === 'Computer Systems Engineering') {
                const csWeight = weightKeys.find(k => k.includes('CS') || k.includes('CSE'));
                if (csWeight) selectedWeightKey = csWeight;
            } else {
                const itWeight = weightKeys.find(k => k.includes('IT'));
                if (itWeight) selectedWeightKey = itWeight;
            }
        }

        if (selectedWeightKey) {
            const weightConfig = currentFacultyData.wgpaWeights[selectedWeightKey];

            // Convert percentage to decimal weights
            const weights = {};
            Object.keys(weightConfig).forEach(yearKey => {
                const yearNum = parseInt(yearKey.replace('Year', ''));
                const percentStr = weightConfig[yearKey];
                const decimal = parseFloat(percentStr.replace('%', '')) / 100;
                weights[yearNum] = decimal;
            });

            // Calculate weighted GPA
            Object.keys(yearData).forEach(year => {
                const yearGPA = yearData[year].points / yearData[year].credits;
                const weight = weights[year] || 0;
                wgpa += yearGPA * weight;
            });
        }
    }

    displayResults(gpa, wgpa, semesterData);
}

function displayResults(gpa, wgpa, semesterData) {
    const resultsSection = document.getElementById('resultsSection');
    const gpaValue = document.getElementById('gpaValue');
    const wgpaValue = document.getElementById('wgpaValue');
    const breakdownDiv = document.getElementById('semesterBreakdown');
    const deansListMessage = document.getElementById('deansListMessage');

    gpaValue.textContent = gpa.toFixed(2);
    wgpaValue.textContent = wgpa.toFixed(2);

    if (gpa >= 3.7) {
        // Dean's List
        deansListMessage.textContent = "🎉 Congratulations! You're on the Dean's List!";
        deansListMessage.classList.add('show');
        deansListMessage.style.background = "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)";
        deansListMessage.style.color = "#78350f";

        showCongratsAnimation();
    } else if (gpa >= 3.5) {
        // Close to List
        deansListMessage.textContent = "💪 Keep working, next semester you'll be on the Dean's List!";
        deansListMessage.classList.add('show');
        deansListMessage.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
        deansListMessage.style.color = "#ffffff";
    } else if (gpa >= 3.0) {
        deansListMessage.textContent = "📈 You're doing great, let's work harder!";
        deansListMessage.classList.add('show');
        deansListMessage.style.background = "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
        deansListMessage.style.color = "#ffffff";
    } else if (gpa >= 2.5) {
        deansListMessage.textContent = "⚡ You're doing okay, but let's do better!";
        deansListMessage.classList.add('show');
        deansListMessage.style.background = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        deansListMessage.style.color = "#ffffff";
    } else {
        // Below average
        deansListMessage.textContent = "🚀 I know you can do better, let's start now!";
        deansListMessage.classList.add('show');
        deansListMessage.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
        deansListMessage.style.color = "#ffffff";
    }

    let breakdownHTML = '';
    Object.keys(semesterData).forEach(semester => {
        const semGPA = semesterData[semester].points / semesterData[semester].credits;
        breakdownHTML += `
            <div class="breakdown-item">
                <span class="breakdown-label">${semester}</span>
                <span class="breakdown-value">GPA: ${semGPA.toFixed(2)} | Credits: ${semesterData[semester].credits}</span>
            </div>
        `;
    });

    breakdownDiv.innerHTML = breakdownHTML;
    resultsSection.classList.add('active');

    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function showCongratsAnimation() {
    const overlay = document.getElementById('congratsOverlay');
    overlay.classList.add('show');

    createConfetti();

    setTimeout(() => {
        overlay.classList.remove('show');
    }, 5000);

    overlay.addEventListener('click', () => {
        overlay.classList.remove('show');
    });
}

function createConfetti() {
    const confettiContainer = document.querySelector('.confetti');
    confettiContainer.innerHTML = '';

    const colors = ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = -20 + 'px';
        confetti.style.borderRadius = '50%';
        confetti.style.animation = `confettiFall ${2 + Math.random() * 2}s linear`;
        confetti.style.opacity = '0.8';

        confettiContainer.appendChild(confetti);
    }

    if (!document.getElementById('confetti-animation')) {
        const style = document.createElement('style');
        style.id = 'confetti-animation';
        style.textContent = `
            @keyframes confettiFall {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(600px) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function resetForm() {
    document.getElementById('faculty').value = '';
    document.getElementById('department').value = '';
    document.getElementById('department').disabled = true;

    currentFacultyData = null;
    moduleData = {};

    document.querySelectorAll('.grade-select').forEach(select => {
        select.value = '';
        select.classList.remove('grade-entered');
    });

    // Hide Dean's List message
    const deansListMessage = document.getElementById('deansListMessage');
    if (deansListMessage) {
        deansListMessage.classList.remove('show');
    }

    hideModules();
    hideResults();
    hideMessage('error');
    hideMessage('success');
}

function hideModules() {
    document.getElementById('modulesSection').classList.remove('active');
    document.getElementById('actionButtons').classList.remove('active');
}

function hideResults() {
    document.getElementById('resultsSection').classList.remove('active');
}

function showMessage(type, message) {
    const element = type === 'error' ?
        document.getElementById('errorMessage') :
        document.getElementById('successMessage');

    element.textContent = message;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function hideMessage(type) {
    const element = type === 'error' ?
        document.getElementById('errorMessage') :
        document.getElementById('successMessage');

    element.style.display = 'none';
}